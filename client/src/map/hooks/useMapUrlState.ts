import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MAP_STATE,
  normalizeMapState,
  parseMapStateFromSearch,
  serializeMapStateToSearch,
  type FlowPlaybackMode,
  type MapCameraState,
  type MapState,
  type TimeFilterState,
} from 'map/state/map-state';

function getInitialState(): MapState {
  if (typeof window === 'undefined') {
    return DEFAULT_MAP_STATE;
  }

  return parseMapStateFromSearch(window.location.search);
}

export function useMapUrlState() {
  const [state, setState] = useState<MapState>(getInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      setState(parseMapStateFromSearch(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextSearch = serializeMapStateToSearch(state);
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [state]);

  const setCamera = useCallback((camera: Partial<MapCameraState>) => {
    setState((current) => normalizeMapState({
      ...current,
      camera: {
        ...current.camera,
        ...camera,
      },
    }));
  }, []);

  const setTimeFilter = useCallback((timeFilter: TimeFilterState) => {
    setState((current) => normalizeMapState({
      ...current,
      timeFilter,
    }));
  }, []);

  const setShowAttackArcs = useCallback((showAttackArcs: boolean) => {
    setState((current) => normalizeMapState({
      ...current,
      showAttackArcs,
    }));
  }, []);

  const setFlowPlaybackMode = useCallback((flowPlaybackMode: FlowPlaybackMode) => {
    setState((current) => normalizeMapState({
      ...current,
      flowPlaybackMode,
    }));
  }, []);

  const setActiveLayerIds = useCallback((activeLayerIds: string[]) => {
    setState((current) => normalizeMapState({
      ...current,
      activeLayerIds,
    }));
  }, []);

  return {
    state,
    setState,
    setCamera,
    setTimeFilter,
    setShowAttackArcs,
    setFlowPlaybackMode,
    setActiveLayerIds,
  };
}
