import { create } from 'zustand';

interface UIState {
  searchModalOpen: boolean;
  signalModalOpen: boolean;
  countryBriefOpen: boolean;
  countryBriefCode: string | null;
  settingsOpen: boolean;
  breakingBannerVisible: boolean;
  isIdle: boolean;
  isPlaybackMode: boolean;
  isDestroyed: boolean;
  initialLoadComplete: boolean;

  openSearchModal: () => void;
  closeSearchModal: () => void;
  openSignalModal: () => void;
  closeSignalModal: () => void;
  openCountryBrief: (code: string) => void;
  closeCountryBrief: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setBreakingBannerVisible: (visible: boolean) => void;
  setIdle: (idle: boolean) => void;
  setPlaybackMode: (playing: boolean) => void;
  setDestroyed: (destroyed: boolean) => void;
  setInitialLoadComplete: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchModalOpen: false,
  signalModalOpen: false,
  countryBriefOpen: false,
  countryBriefCode: null,
  settingsOpen: false,
  breakingBannerVisible: false,
  isIdle: false,
  isPlaybackMode: false,
  isDestroyed: false,
  initialLoadComplete: false,

  openSearchModal: () => set({ searchModalOpen: true }),
  closeSearchModal: () => set({ searchModalOpen: false }),
  openSignalModal: () => set({ signalModalOpen: true }),
  closeSignalModal: () => set({ signalModalOpen: false }),
  openCountryBrief: (code) => set({ countryBriefOpen: true, countryBriefCode: code }),
  closeCountryBrief: () => set({ countryBriefOpen: false, countryBriefCode: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setBreakingBannerVisible: (visible) => set({ breakingBannerVisible: visible }),
  setIdle: (idle) => set({ isIdle: idle }),
  setPlaybackMode: (playing) => set({ isPlaybackMode: playing }),
  setDestroyed: (destroyed) => set({ isDestroyed: destroyed }),
  setInitialLoadComplete: () => set({ initialLoadComplete: true }),
}));
