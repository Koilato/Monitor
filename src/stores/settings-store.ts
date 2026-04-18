import { create } from 'zustand';

interface SettingsState {
  theme: 'dark' | 'light';
  locale: string;
  variant: string;
  temperatureUnit: 'celsius' | 'fahrenheit';

  setTheme: (theme: 'dark' | 'light') => void;
  setLocale: (locale: string) => void;
  setVariant: (variant: string) => void;
  setTemperatureUnit: (unit: 'celsius' | 'fahrenheit') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('worldmonitor-theme') as 'dark' | 'light') || 'dark',
  locale: navigator.language.split('-')[0] || 'en',
  variant: document.documentElement.dataset.variant || 'full',
  temperatureUnit: 'celsius',

  setTheme: (theme) => { localStorage.setItem('worldmonitor-theme', theme); set({ theme }); },
  setLocale: (locale) => set({ locale }),
  setVariant: (variant) => set({ variant }),
  setTemperatureUnit: (unit) => set({ temperatureUnit: unit }),
}));
