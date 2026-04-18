import { create } from 'zustand';

interface AppState {
  isMobile: boolean;
  isIdle: boolean;
  isDestroyed: boolean;
  initialLoadComplete: boolean;
  isOnline: boolean;

  setIsMobile: (mobile: boolean) => void;
  setIdle: (idle: boolean) => void;
  setDestroyed: (destroyed: boolean) => void;
  setInitialLoadComplete: () => void;
  setOnline: (online: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isMobile: false,
  isIdle: false,
  isDestroyed: false,
  initialLoadComplete: false,
  isOnline: navigator.onLine,

  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setIdle: (idle) => set({ isIdle: idle }),
  setDestroyed: (destroyed) => set({ isDestroyed: destroyed }),
  setInitialLoadComplete: () => set({ initialLoadComplete: true }),
  setOnline: (online) => set({ isOnline: online }),
}));
