import { useEffect, useState } from 'react';
import type { MapDebugSettings } from '../lib/types';
import {
  DEFAULT_TWO_D_MAP_CONFIG,
  normalizeTwoDMapConfig,
} from '../lib/map-2d-config';
import {
  DEFAULT_THREE_D_MAP_CONFIG,
  normalizeThreeDMapConfig,
} from '../lib/map-3d-config';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v9';
const DEBUG_MODE_STORAGE_KEY = 'world-monitor.map-debug-mode.v1';
const LATEST_SECTION_HEIGHT_MIN = 100;
const LATEST_SECTION_HEIGHT_MAX = 560;

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 160,
  twoD: DEFAULT_TWO_D_MAP_CONFIG,
  threeD: DEFAULT_THREE_D_MAP_CONFIG,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function coerceMapDebugSettings(value: unknown): MapDebugSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_MAP_DEBUG_SETTINGS;
  }

  const record = value as Partial<MapDebugSettings> & {
    twoD?: Partial<MapDebugSettings['twoD']>;
    threeD?: Partial<MapDebugSettings['threeD']>;
  };

  return {
    latestSectionHeight: isFiniteNumber(record.latestSectionHeight)
      ? clamp(record.latestSectionHeight, LATEST_SECTION_HEIGHT_MIN, LATEST_SECTION_HEIGHT_MAX)
      : DEFAULT_MAP_DEBUG_SETTINGS.latestSectionHeight,
    twoD: normalizeTwoDMapConfig({
      ...DEFAULT_TWO_D_MAP_CONFIG,
      ...record.twoD,
      contentPaddingX: isFiniteNumber(record.twoD?.contentPaddingX)
        ? record.twoD.contentPaddingX
        : isFiniteNumber((record.twoD as { contentInsetX?: number } | undefined)?.contentInsetX)
          ? (record.twoD as { contentInsetX?: number }).contentInsetX!
          : DEFAULT_TWO_D_MAP_CONFIG.contentPaddingX,
    }),
    threeD: normalizeThreeDMapConfig({
      ...DEFAULT_THREE_D_MAP_CONFIG,
      ...record.threeD,
    }),
  };
}

function readStoredSettings(): MapDebugSettings | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return coerceMapDebugSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export interface UseMapDebugSettingsResult {
  debugModeEnabled: boolean;
  setDebugModeEnabled: (enabled: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  persistEnabled: boolean;
  setPersistEnabled: (enabled: boolean) => void;
  settings: MapDebugSettings;
  resetSettings: () => void;
  updateLatestSectionHeight: (value: number) => void;
  updateTwoDSettings: (patch: Partial<MapDebugSettings['twoD']>) => void;
  updateThreeDSettings: (patch: Partial<MapDebugSettings['threeD']>) => void;
}

export function useMapDebugSettings(): UseMapDebugSettingsResult {
  const [panelOpen, setPanelOpen] = useState(false);
  const [debugModeEnabled, setDebugModeEnabledState] = useState(false);
  const [persistEnabled, setPersistEnabledState] = useState(false);
  const [settings, setSettings] = useState<MapDebugSettings>(DEFAULT_MAP_DEBUG_SETTINGS);

  useEffect(() => {
    const stored = readStoredSettings();
    if (stored) {
      setSettings(stored);
      setPersistEnabledState(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
    if (raw === 'true') {
      setDebugModeEnabledState(true);
      setPanelOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!persistEnabled) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [persistEnabled, settings]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!debugModeEnabled) {
      window.localStorage.removeItem(DEBUG_MODE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, 'true');
  }, [debugModeEnabled]);

  const updateLatestSectionHeight = (value: number) => {
    setSettings((current) => ({
      ...current,
      latestSectionHeight: clamp(value, LATEST_SECTION_HEIGHT_MIN, LATEST_SECTION_HEIGHT_MAX),
    }));
  };

  const updateTwoDSettings = (patch: Partial<MapDebugSettings['twoD']>) => {
    setSettings((current) => ({
      ...current,
      twoD: normalizeTwoDMapConfig({
        ...current.twoD,
        ...patch,
      }),
    }));
  };

  const updateThreeDSettings = (patch: Partial<MapDebugSettings['threeD']>) => {
    setSettings((current) => ({
      ...current,
      threeD: normalizeThreeDMapConfig({
        ...current.threeD,
        ...patch,
      }),
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_MAP_DEBUG_SETTINGS);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const setPersistEnabled = (enabled: boolean) => {
    setPersistEnabledState(enabled);
    if (!enabled && typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (enabled && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  };

  const setDebugModeEnabled = (enabled: boolean) => {
    setDebugModeEnabledState(enabled);
    if (enabled) {
      setPanelOpen(true);
      return;
    }

    setPanelOpen(false);
  };

  return {
    debugModeEnabled,
    setDebugModeEnabled,
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled,
    settings,
    resetSettings,
    updateLatestSectionHeight,
    updateTwoDSettings,
    updateThreeDSettings,
  };
}
