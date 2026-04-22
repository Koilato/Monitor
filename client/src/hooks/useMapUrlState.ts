import { useEffect, useState } from 'react';
import {
  DEFAULT_MAP_URL_STATE,
  normalizeMapUrlState,
  parseMapUrlState,
  serializeMapUrlState,
  type MapCameraState,
  type MapTimeFilterState,
  type MapUrlState,
  type MapViewMode,
} from '../lib/map-state';

export interface UseMapUrlStateResult {
  state: MapUrlState;
  setViewMode: (viewMode: MapViewMode) => void;
  setTimeFilter: (timeFilter: MapTimeFilterState) => void;
  setCamera: (camera: MapCameraState) => void;
  reset: () => void;
}

export function useMapUrlState(): UseMapUrlStateResult {
  const [state, setState] = useState<MapUrlState>(DEFAULT_MAP_URL_STATE);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setState(parseMapUrlState(window.location.search));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      setState(parseMapUrlState(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = serializeMapUrlState(state).toString();
    const nextUrl = `${window.location.pathname}${params ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [state]);

  return {
    state,
    setViewMode: (viewMode) => {
      setState((current) => normalizeMapUrlState({
        ...current,
        viewMode,
      }));
    },
    setTimeFilter: (timeFilter) => {
      setState((current) => normalizeMapUrlState({
        ...current,
        timeFilter,
      }));
    },
    setCamera: (camera) => {
      setState((current) => normalizeMapUrlState({
        ...current,
        camera,
      }));
    },
    reset: () => {
      setState(DEFAULT_MAP_URL_STATE);
    },
  };
}
