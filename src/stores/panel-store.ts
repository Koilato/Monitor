import { create } from 'zustand';
import type { PanelConfig, MapLayers } from '@/types';
import type { TimeRange } from '@/components';

interface PanelState {
  panelSettings: Record<string, PanelConfig>;
  panelOrder: string[];
  panelSpans: Record<string, number>;
  panelColSpans: Record<string, number>;
  collapsedPanels: Record<string, boolean>;
  disabledSources: Set<string>;
  mapLayers: MapLayers;
  currentTimeRange: TimeRange;

  setPanelSettings: (settings: Record<string, PanelConfig>) => void;
  setPanelOrder: (order: string[]) => void;
  setPanelSpan: (id: string, span: number) => void;
  setPanelColSpan: (id: string, span: number) => void;
  togglePanelCollapsed: (id: string) => void;
  setDisabledSources: (sources: Set<string>) => void;
  setMapLayers: (layers: MapLayers) => void;
  setCurrentTimeRange: (range: TimeRange) => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  panelSettings: {},
  panelOrder: [],
  panelSpans: {},
  panelColSpans: {},
  collapsedPanels: {},
  disabledSources: new Set<string>(),
  mapLayers: {} as MapLayers,
  currentTimeRange: '7d' as TimeRange,

  setPanelSettings: (settings) => set({ panelSettings: settings }),
  setPanelOrder: (order) => set({ panelOrder: order }),
  setPanelSpan: (id, span) => set((s) => ({ panelSpans: { ...s.panelSpans, [id]: span } })),
  setPanelColSpan: (id, span) => set((s) => ({ panelColSpans: { ...s.panelColSpans, [id]: span } })),
  togglePanelCollapsed: (id) => set((s) => ({ collapsedPanels: { ...s.collapsedPanels, [id]: !s.collapsedPanels[id] } })),
  setDisabledSources: (sources) => set({ disabledSources: sources }),
  setMapLayers: (layers) => set({ mapLayers: layers }),
  setCurrentTimeRange: (range) => set({ currentTimeRange: range }),
}));
