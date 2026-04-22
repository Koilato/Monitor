import { useEffect, useState } from 'react';
import type { MapDebugSettings } from 'map/state/map-types';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v11';
const DEBUG_MODE_STORAGE_KEY = 'world-monitor.map-debug-mode.v1';
const LATEST_SECTION_HEIGHT_MIN = 100;
const LATEST_SECTION_HEIGHT_MAX = 560;

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 160,
  minZoom: -2,
  maxZoom: 6,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function coerceMapDebugSettings(value: unknown): MapDebugSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_MAP_DEBUG_SETTINGS;
  }

  const record = value as Partial<MapDebugSettings>;
  const minZoom = isFiniteNumber(record.minZoom)
    ? clamp(record.minZoom, -6, 10)
    : DEFAULT_MAP_DEBUG_SETTINGS.minZoom;
  const maxZoom = isFiniteNumber(record.maxZoom)
    ? Math.max(minZoom, clamp(record.maxZoom, -6, 10))
    : DEFAULT_MAP_DEBUG_SETTINGS.maxZoom;

  return {
    latestSectionHeight: isFiniteNumber(record.latestSectionHeight)
      ? clamp(record.latestSectionHeight, LATEST_SECTION_HEIGHT_MIN, LATEST_SECTION_HEIGHT_MAX)
      : DEFAULT_MAP_DEBUG_SETTINGS.latestSectionHeight,
    minZoom,
    maxZoom,
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
  updateMapSettings: (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight'>>) => void;
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

  const updateMapSettings = (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight'>>) => {
    setSettings((current) => coerceMapDebugSettings({
      ...current,
      ...patch,
    }));
  };

  return {
    debugModeEnabled,
    setDebugModeEnabled: (enabled) => {
      setDebugModeEnabledState(enabled);
      setPanelOpen(enabled);
    },
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled: (enabled) => {
      setPersistEnabledState(enabled);
      if (!enabled && typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    },
    settings,
    resetSettings: () => setSettings(DEFAULT_MAP_DEBUG_SETTINGS),
    updateLatestSectionHeight,
    updateMapSettings,
  };
}
