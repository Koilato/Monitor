import { create } from 'zustand';
import type { CyberThreat, Monitor } from '@/types';
import type { IntelligenceCache } from '@/app/app-context';

interface IntelligenceState {
  intelligenceCache: IntelligenceCache;
  cyberThreatsCache: CyberThreat[] | null;
  monitors: Monitor[];

  setIntelligenceCache: (cache: Partial<IntelligenceCache>) => void;
  setCyberThreatsCache: (threats: CyberThreat[] | null) => void;
  setMonitors: (monitors: Monitor[]) => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  intelligenceCache: {},
  cyberThreatsCache: null,
  monitors: [],

  setIntelligenceCache: (cache) => set((s) => ({
    intelligenceCache: { ...s.intelligenceCache, ...cache },
  })),
  setCyberThreatsCache: (threats) => set({ cyberThreatsCache: threats }),
  setMonitors: (monitors) => set({ monitors }),
}));
