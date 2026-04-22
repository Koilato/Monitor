import { useEffect, useRef, useState } from 'react';
import type { LatestContentResponse } from '@shared/types';
import { fetchLatestContent } from 'shared/api/client';

export interface UseLatestContentState {
  data: LatestContentResponse | null;
  loading: boolean;
  error: string | null;
}

export function useLatestContent(
  category: string,
  limit: number,
  offset = 0,
): UseLatestContentState {
  const [data, setData] = useState<LatestContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    void fetchLatestContent(category, limit, offset, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }
        setData(response);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Request failed');
      })
      .finally(() => {
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [category, limit, offset]);

  return { data, loading, error };
}
