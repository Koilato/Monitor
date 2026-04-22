import { useEffect, useState } from 'react';
import {
  DEFAULT_MAP_STATE,
  normalizeMapState,
  parseMapStateFromSearch,
  serializeMapStateToSearch,
  switchMapStateView,
  type MapCameraState,
  type MapState,
  type MapViewMode,
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

  return {
    state,
    setState,
    setView(view: MapViewMode) {
      setState((current) => switchMapStateView(current, view));
    },
    setCamera(camera: Partial<MapCameraState>) {
      setState((current) => normalizeMapState({
        ...current,
        camera: {
          ...current.camera,
          ...camera,
        },
      }));
    },
    setTimeFilter(timeFilter: TimeFilterState) {
      setState((current) => normalizeMapState({
        ...current,
        timeFilter,
      }));
    },
    setActiveLayerIds(activeLayerIds: string[]) {
      setState((current) => normalizeMapState({
        ...current,
        activeLayerIds,
      }));
    },
  };
}
