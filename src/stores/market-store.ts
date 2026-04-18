import { create } from 'zustand';
import type { MarketData } from '@/types';
import type { PredictionMarket } from '@/services/prediction';

interface MarketState {
  latestMarkets: MarketData[];
  latestPredictions: PredictionMarket[];

  setLatestMarkets: (markets: MarketData[]) => void;
  setLatestPredictions: (predictions: PredictionMarket[]) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  latestMarkets: [],
  latestPredictions: [],

  setLatestMarkets: (markets) => set({ latestMarkets: markets }),
  setLatestPredictions: (predictions) => set({ latestPredictions: predictions }),
}));
