import { useEffect, useState } from 'react';
import type { AttackArcDebugSettings, MapDebugSettings } from 'map/state/map-types';
import { THREAT_LINE_WIDTH } from 'map/layers/tokens';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v13';
const DEBUG_MODE_STORAGE_KEY = 'world-monitor.map-debug-mode.v1';
const LATEST_SECTION_HEIGHT_MIN = 100;
const LATEST_SECTION_HEIGHT_MAX = 560;
const MIN_MIN_ZOOM = -6;
const MAX_MAX_ZOOM = 10;
const MIN_BUNDLE_COUNT = 1;
const MAX_BUNDLE_COUNT = 12;
const MIN_SPREAD_RATIO = 0.01;
const MAX_SPREAD_RATIO = 0.5;
const MIN_CURVATURE_RATIO = 0.01;
const MAX_CURVATURE_RATIO = 0.6;
const MIN_LINE_WIDTH = 0.5;
const MAX_LINE_WIDTH = 6;
const MIN_SEGMENT_COUNT = 12;
const MAX_SEGMENT_COUNT = 240;
const MIN_DURATION = 100;
const MAX_DURATION = 20000;
const MIN_REPLAY_DELAY = 1000;
const MAX_REPLAY_DELAY = 30000;
const MIN_MAX_CONCURRENT_STARTS = 1;
const MAX_MAX_CONCURRENT_STARTS = 12;
const MIN_THREAT_OUTLINE_WIDTH = 0.5;
const MAX_THREAT_OUTLINE_WIDTH = 8;
const MIN_RING_RADIUS = 2;
const MAX_RING_RADIUS = 80;
const MIN_RING_COUNT = 1;
const MAX_RING_COUNT = 8;
const MIN_RING_SPACING = 0;
const MAX_RING_SPACING = 16;
const MIN_RING_LINE_WIDTH = 0.5;
const MAX_RING_LINE_WIDTH = 6;
const MIN_RING_DOT_RADIUS = 0;
const MAX_RING_DOT_RADIUS = 16;
const MIN_3D_SCALE = 0.25;
const MAX_3D_SCALE = 3;

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 160,
  minZoom: -2,
  maxZoom: 6,
  activeCountryCodes: [],
  threatColorsEnabled: true,
  threatOutlineVisible: true,
  threatOutlineWidth: THREAT_LINE_WIDTH,
  attackArc: {
    bundleCount: 4,
    bundleSpreadRatio: 0.08,
    curvatureRatio: 0.16,
    lineWidth: 1.8,
    segmentCount: 100,
    flightDuration: 1300,
    holdDuration: 2000,
    fadeoutDuration: 700,
    replayDelayMs: 5000,
    bundleIntervalMs: 220,
    maxConcurrentStarts: 4,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
    arcWidthScale3d: 1,
    arrowSizeScale3d: 1,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function coerceAttackArcSettings(value: unknown): AttackArcDebugSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcDebugSettings> : {};

  return {
    bundleCount: isFiniteNumber(record.bundleCount)
      ? Math.round(clampNumber(record.bundleCount, MIN_BUNDLE_COUNT, MAX_BUNDLE_COUNT))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.bundleCount,
    bundleSpreadRatio: isFiniteNumber(record.bundleSpreadRatio)
      ? clampNumber(record.bundleSpreadRatio, MIN_SPREAD_RATIO, MAX_SPREAD_RATIO)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.bundleSpreadRatio,
    curvatureRatio: isFiniteNumber(record.curvatureRatio)
      ? clampNumber(record.curvatureRatio, MIN_CURVATURE_RATIO, MAX_CURVATURE_RATIO)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.curvatureRatio,
    lineWidth: isFiniteNumber(record.lineWidth)
      ? clampNumber(record.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.lineWidth,
    segmentCount: isFiniteNumber(record.segmentCount)
      ? Math.round(clampNumber(record.segmentCount, MIN_SEGMENT_COUNT, MAX_SEGMENT_COUNT))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.segmentCount,
    flightDuration: isFiniteNumber(record.flightDuration)
      ? Math.round(clampNumber(record.flightDuration, MIN_DURATION, MAX_DURATION))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.flightDuration,
    holdDuration: isFiniteNumber(record.holdDuration)
      ? Math.round(clampNumber(record.holdDuration, MIN_DURATION, MAX_DURATION))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.holdDuration,
    fadeoutDuration: isFiniteNumber(record.fadeoutDuration)
      ? Math.round(clampNumber(record.fadeoutDuration, MIN_DURATION, MAX_DURATION))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.fadeoutDuration,
    replayDelayMs: isFiniteNumber(record.replayDelayMs)
      ? Math.round(clampNumber(record.replayDelayMs, MIN_REPLAY_DELAY, MAX_REPLAY_DELAY))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.replayDelayMs,
    bundleIntervalMs: isFiniteNumber(record.bundleIntervalMs)
      ? Math.round(clampNumber(record.bundleIntervalMs, MIN_DURATION, MAX_DURATION))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.bundleIntervalMs,
    maxConcurrentStarts: isFiniteNumber(record.maxConcurrentStarts)
      ? Math.round(clampNumber(record.maxConcurrentStarts, MIN_MAX_CONCURRENT_STARTS, MAX_MAX_CONCURRENT_STARTS))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.maxConcurrentStarts,
    ringRadius: isFiniteNumber(record.ringRadius)
      ? clampNumber(record.ringRadius, MIN_RING_RADIUS, MAX_RING_RADIUS)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.ringRadius,
    ringCount: isFiniteNumber(record.ringCount)
      ? Math.round(clampNumber(record.ringCount, MIN_RING_COUNT, MAX_RING_COUNT))
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.ringCount,
    ringSpacing: isFiniteNumber(record.ringSpacing)
      ? clampNumber(record.ringSpacing, MIN_RING_SPACING, MAX_RING_SPACING)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.ringSpacing,
    ringLineWidth: isFiniteNumber(record.ringLineWidth)
      ? clampNumber(record.ringLineWidth, MIN_RING_LINE_WIDTH, MAX_RING_LINE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.ringLineWidth,
    ringDotRadius: isFiniteNumber(record.ringDotRadius)
      ? clampNumber(record.ringDotRadius, MIN_RING_DOT_RADIUS, MAX_RING_DOT_RADIUS)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.ringDotRadius,
    arcWidthScale3d: isFiniteNumber(record.arcWidthScale3d)
      ? clampNumber(record.arcWidthScale3d, MIN_3D_SCALE, MAX_3D_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.arcWidthScale3d,
    arrowSizeScale3d: isFiniteNumber(record.arrowSizeScale3d)
      ? clampNumber(record.arrowSizeScale3d, MIN_3D_SCALE, MAX_3D_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.arrowSizeScale3d,
  };
}

function normalizeActiveCountryCodes(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = rawValues
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => /^[A-Z]{2}$/.test(entry));

  return normalized.filter((entry, index) => normalized.indexOf(entry) === index);
}

export function parseActiveCountryCodesInput(value: string): string[] {
  return normalizeActiveCountryCodes(value);
}

export function coerceMapDebugSettings(value: unknown): MapDebugSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_MAP_DEBUG_SETTINGS;
  }

  const record = value as Partial<MapDebugSettings>;
  const minZoom = isFiniteNumber(record.minZoom)
    ? clamp(record.minZoom, MIN_MIN_ZOOM, MAX_MAX_ZOOM)
    : DEFAULT_MAP_DEBUG_SETTINGS.minZoom;
  const maxZoom = isFiniteNumber(record.maxZoom)
    ? Math.max(minZoom, clamp(record.maxZoom, MIN_MIN_ZOOM, MAX_MAX_ZOOM))
    : DEFAULT_MAP_DEBUG_SETTINGS.maxZoom;

  return {
    latestSectionHeight: isFiniteNumber(record.latestSectionHeight)
      ? clamp(record.latestSectionHeight, LATEST_SECTION_HEIGHT_MIN, LATEST_SECTION_HEIGHT_MAX)
      : DEFAULT_MAP_DEBUG_SETTINGS.latestSectionHeight,
    minZoom,
    maxZoom,
    activeCountryCodes: normalizeActiveCountryCodes(record.activeCountryCodes),
    threatColorsEnabled: coerceBoolean(record.threatColorsEnabled, DEFAULT_MAP_DEBUG_SETTINGS.threatColorsEnabled),
    threatOutlineVisible: coerceBoolean(record.threatOutlineVisible, DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineVisible),
    threatOutlineWidth: isFiniteNumber(record.threatOutlineWidth)
      ? clampNumber(record.threatOutlineWidth, MIN_THREAT_OUTLINE_WIDTH, MAX_THREAT_OUTLINE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineWidth,
    attackArc: coerceAttackArcSettings(record.attackArc),
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
  updateMapSettings: (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight' | 'activeCountryCodes'>>) => void;
  updateActiveCountryCodes: (value: string) => void;
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

  const updateMapSettings = (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight' | 'activeCountryCodes'>>) => {
    setSettings((current) => coerceMapDebugSettings({
      ...current,
      ...patch,
      attackArc: {
        ...current.attackArc,
        ...patch.attackArc,
      },
    }));
  };

  const updateActiveCountryCodes = (value: string) => {
    setSettings((current) => ({
      ...current,
      activeCountryCodes: parseActiveCountryCodesInput(value),
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
    updateActiveCountryCodes,
  };
}
