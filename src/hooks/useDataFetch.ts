import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseDataFetchOptions<T> {
  fetchFn: (signal: AbortSignal) => Promise<T>;
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseDataFetchReturn<T> {
  data: T | undefined;
  fetching: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export function useDataFetch<T>(options: UseDataFetchOptions<T>): UseDataFetchReturn<T> {
  const { fetchFn, enabled = true, refreshInterval } = options;
  const [data, setData] = useState<T | undefined>();
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const execute = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);
    setError(undefined);
    try {
      const result = await fetchFn(controller.signal);
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      if (!controller.signal.aborted) {
        setFetching(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;
    execute();
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(execute, refreshInterval);
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, execute, refreshInterval]);

  const refetch = useCallback(() => { execute(); }, [execute]);

  return { data, fetching, error, refetch };
}
