import { create } from 'zustand';

type MapMode = 'deckgl' | 'globe' | 'svg';
type MapView = 'global' | 'america' | 'mena' | 'eu' | 'asia' | 'latam' | 'africa' | 'oceania';

interface MapState {
  mapMode: MapMode;
  view: MapView;
  zoom: number;
  center: [number, number];

  setMapMode: (mode: MapMode) => void;
  setView: (view: MapView) => void;
  setZoom: (zoom: number) => void;
  setCenter: (center: [number, number]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  mapMode: 'deckgl' as MapMode,
  view: 'global' as MapView,
  zoom: 2,
  center: [20, 0] as [number, number],

  setMapMode: (mode) => set({ mapMode: mode }),
  setView: (view) => set({ view: view }),
  setZoom: (zoom) => set({ zoom: zoom }),
  setCenter: (center) => set({ center: center }),
}));
