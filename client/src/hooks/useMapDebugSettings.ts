import { useEffect, useState } from 'react';
import { DEFAULT_MAP_DEBUG_SETTINGS, type MapDebugSettings } from '../lib/types';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v2';
const TWO_D_MIN_ZOOM_LIMIT = -2;

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
    viewportPadding: isFiniteNumber(record.viewportPadding)
      ? Math.max(0, record.viewportPadding)
      : DEFAULT_MAP_DEBUG_SETTINGS.viewportPadding,
    latestSectionHeight: isFiniteNumber(record.latestSectionHeight)
      ? clamp(record.latestSectionHeight, 100, 420)
      : DEFAULT_MAP_DEBUG_SETTINGS.latestSectionHeight,
    twoD: (() => {
      const centerLng = isFiniteNumber(record.twoD?.centerLng)
        ? record.twoD.centerLng
        : DEFAULT_MAP_DEBUG_SETTINGS.twoD.centerLng;
      const centerLat = isFiniteNumber(record.twoD?.centerLat)
        ? record.twoD.centerLat
        : DEFAULT_MAP_DEBUG_SETTINGS.twoD.centerLat;
      const minZoom = Math.max(TWO_D_MIN_ZOOM_LIMIT, isFiniteNumber(record.twoD?.minZoom)
        ? record.twoD.minZoom
        : DEFAULT_MAP_DEBUG_SETTINGS.twoD.minZoom);
      const maxZoom = Math.max(minZoom, isFiniteNumber(record.twoD?.maxZoom)
        ? record.twoD.maxZoom
        : DEFAULT_MAP_DEBUG_SETTINGS.twoD.maxZoom);
      const zoom = clamp(isFiniteNumber(record.twoD?.zoom)
        ? record.twoD.zoom
        : DEFAULT_MAP_DEBUG_SETTINGS.twoD.zoom, minZoom, maxZoom);

      return {
        centerLng: clamp(centerLng, -180, 180),
        centerLat: clamp(centerLat, -90, 90),
        zoom,
        minZoom,
        maxZoom,
      };
    })(),
    threeD: {
      povLng: clamp(isFiniteNumber(record.threeD?.povLng)
        ? record.threeD.povLng
        : DEFAULT_MAP_DEBUG_SETTINGS.threeD.povLng, -180, 180),
      povLat: clamp(isFiniteNumber(record.threeD?.povLat)
        ? record.threeD.povLat
        : DEFAULT_MAP_DEBUG_SETTINGS.threeD.povLat, -90, 90),
      povAltitude: Math.max(0.2, isFiniteNumber(record.threeD?.povAltitude)
        ? record.threeD.povAltitude
        : DEFAULT_MAP_DEBUG_SETTINGS.threeD.povAltitude),
    },
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
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  persistEnabled: boolean;
  setPersistEnabled: (enabled: boolean) => void;
  settings: MapDebugSettings;
  resetSettings: () => void;
  updateViewportPadding: (value: number) => void;
  updateLatestSectionHeight: (value: number) => void;
  updateTwoDSettings: (patch: Partial<MapDebugSettings['twoD']>) => void;
  updateThreeDSettings: (patch: Partial<MapDebugSettings['threeD']>) => void;
}

export function useMapDebugSettings(): UseMapDebugSettingsResult {
  const [panelOpen, setPanelOpen] = useState(false);
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

    if (!persistEnabled) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [persistEnabled, settings]);

  const updateViewportPadding = (value: number) => {
    setSettings((current) => ({
      ...current,
      viewportPadding: Math.max(0, value),
    }));
  };

  const updateLatestSectionHeight = (value: number) => {
    setSettings((current) => ({
      ...current,
      latestSectionHeight: clamp(value, 100, 420),
    }));
  };

  const updateTwoDSettings = (patch: Partial<MapDebugSettings['twoD']>) => {
    setSettings((current) => ({
      ...current,
      twoD: (() => {
        const next = {
          ...current.twoD,
          ...patch,
        };
        const centerLng = clamp(next.centerLng, -180, 180);
        const centerLat = clamp(next.centerLat, -90, 90);
        const minZoom = Math.max(TWO_D_MIN_ZOOM_LIMIT, next.minZoom);
        const maxZoom = Math.max(minZoom, next.maxZoom);
        const zoom = clamp(next.zoom, minZoom, maxZoom);

        return {
          centerLng,
          centerLat,
          minZoom,
          maxZoom,
          zoom,
        };
      })(),
    }));
  };

  const updateThreeDSettings = (patch: Partial<MapDebugSettings['threeD']>) => {
    setSettings((current) => ({
      ...current,
      threeD: {
        povLng: clamp(patch.povLng ?? current.threeD.povLng, -180, 180),
        povLat: clamp(patch.povLat ?? current.threeD.povLat, -90, 90),
        povAltitude: Math.max(0.2, patch.povAltitude ?? current.threeD.povAltitude),
      },
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

  return {
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled,
    settings,
    resetSettings,
    updateViewportPadding,
    updateLatestSectionHeight,
    updateTwoDSettings,
    updateThreeDSettings,
  };
}
