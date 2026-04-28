import { useEffect, useRef, useState } from 'react';
import type { ThreatIntelResponse, ThreatIntelSortOrder } from '@shared/types';
import { fetchThreatIntel } from 'shared/api/client';

export interface UseThreatIntelFeedOptions {
  limit?: number;
  offset?: number;
  initialSortOrder?: ThreatIntelSortOrder;
  refreshIntervalMs?: number;
}

export interface UseThreatIntelFeedState {
  data: ThreatIntelResponse | null;
  loading: boolean;
  error: string | null;
  sortOrder: ThreatIntelSortOrder;
  setSortOrder: (sortOrder: ThreatIntelSortOrder) => void;
  toggleSortOrder: () => void;
  refreshEnabled: boolean;
  setRefreshEnabled: (enabled: boolean) => void;
  lastUpdatedAt: string | null;
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: string }).name === 'AbortError';
}

export function useThreatIntelFeed(options: UseThreatIntelFeedOptions = {}): UseThreatIntelFeedState {
  const {
    limit = 5,
    offset = 0,
    initialSortOrder = 'desc',
    refreshIntervalMs = 15000,
  } = options;
  const [data, setData] = useState<ThreatIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<ThreatIntelSortOrder>(initialSortOrder);
  const [refreshEnabled, setRefreshEnabled] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!refreshEnabled) {
      return;
    }

    setRefreshTick((value) => value + 1);

    const timer = window.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, refreshIntervalMs);

    return () => window.clearInterval(timer);
  }, [refreshEnabled, refreshIntervalMs]);

  useEffect(() => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    void fetchThreatIntel(sortOrder, limit, offset, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }
        setData(response);
        setLastUpdatedAt(new Date().toISOString());
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId || isAbortError(fetchError)) {
          return;
        }
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : '请求失败');
      })
      .finally(() => {
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [limit, offset, refreshTick, sortOrder]);

  useEffect(() => () => {
    requestRef.current?.abort();
  }, []);

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
  };

  return {
    data,
    loading,
    error,
    sortOrder,
    setSortOrder,
    toggleSortOrder,
    refreshEnabled,
    setRefreshEnabled,
    lastUpdatedAt,
  };
}
