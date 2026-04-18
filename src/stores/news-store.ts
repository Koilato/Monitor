import { create } from 'zustand';
import type { NewsItem, ClusteredEvent } from '@/types';

interface NewsState {
  allNews: NewsItem[];
  newsByCategory: Record<string, NewsItem[]>;
  latestClusters: ClusteredEvent[];
  happyAllItems: NewsItem[];
  inFlight: Set<string>;
  seenGeoAlerts: Set<string>;

  setAllNews: (news: NewsItem[]) => void;
  setNewsByCategory: (byCategory: Record<string, NewsItem[]>) => void;
  setLatestClusters: (clusters: ClusteredEvent[]) => void;
  setHappyAllItems: (items: NewsItem[]) => void;
  addInFlight: (key: string) => void;
  removeInFlight: (key: string) => void;
  addSeenGeoAlert: (key: string) => void;
  clearInFlight: () => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  allNews: [],
  newsByCategory: {},
  latestClusters: [],
  happyAllItems: [],
  inFlight: new Set<string>(),
  seenGeoAlerts: new Set<string>(),

  setAllNews: (news) => set({ allNews: news }),
  setNewsByCategory: (byCategory) => set({ newsByCategory: byCategory }),
  setLatestClusters: (clusters) => set({ latestClusters: clusters }),
  setHappyAllItems: (items) => set({ happyAllItems: items }),
  addInFlight: (key) => set((s) => { s.inFlight.add(key); return { inFlight: new Set(s.inFlight) }; }),
  removeInFlight: (key) => set((s) => { s.inFlight.delete(key); return { inFlight: new Set(s.inFlight) }; }),
  addSeenGeoAlert: (key) => set((s) => { s.seenGeoAlerts.add(key); return { seenGeoAlerts: new Set(s.seenGeoAlerts) }; }),
  clearInFlight: () => set({ inFlight: new Set<string>() }),
}));
