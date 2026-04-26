import { useEffect, useState } from 'react';
import type {
  ArcLengthPreset,
  AttackArcStagePreset,
  AttackArcStageSettings,
  AttackArcDebugSettings,
  AttackArcLengthPresetSettings,
  AttackArcLengthThresholds,
  CountryCenterPoint,
  MapDebugSettings,
} from 'map/state/map-types';
import { THREAT_LINE_WIDTH } from 'map/layers/tokens';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v15';
const LEGACY_STORAGE_KEY = 'world-monitor.map-debug-settings.v14';
const DEBUG_MODE_STORAGE_KEY = 'world-monitor.map-debug-mode.v1';
const LATEST_SECTION_HEIGHT_MIN = 100;
const LATEST_SECTION_HEIGHT_MAX = 560;
const MIN_MIN_ZOOM = -6;
const MAX_MAX_ZOOM = 10;
const MIN_BUNDLE_COUNT = 1;
const MAX_BUNDLE_COUNT = 12;
const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 360;
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

function createDefaultStageSettings(
  curvatureRatio: number,
  bundleSpreadRatio: number,
  lineWidth: number,
  segmentCount: number,
): AttackArcStageSettings {
  return {
    curvatureRatio,
    bundleSpreadRatio,
    lineWidth,
    segmentCount,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
  };
}

function createDefaultLengthPresetSettings(stageSettings: AttackArcStageSettings): AttackArcLengthPresetSettings {
  return {
    bundleCount: 4,
    flightDuration: 1300,
    holdDuration: 2000,
    fadeoutDuration: 700,
    replayDelayMs: 5000,
    bundleIntervalMs: 220,
    maxConcurrentStarts: 4,
    stages: {
      stage1: { ...stageSettings },
      stage2: { ...stageSettings },
      stage3: { ...stageSettings },
    },
  };
}

const DEFAULT_ATTACK_ARC_LENGTH_PRESETS: Record<ArcLengthPreset, AttackArcLengthPresetSettings> = {
  short: createDefaultLengthPresetSettings(createDefaultStageSettings(0.08, 0.05, 1.5, 64)),
  medium: createDefaultLengthPresetSettings(createDefaultStageSettings(0.16, 0.08, 1.8, 100)),
  long: createDefaultLengthPresetSettings(createDefaultStageSettings(0.24, 0.12, 2.2, 140)),
};

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 160,
  minZoom: -2,
  maxZoom: 6,
  activeCountryCodes: [],
  countryCenterOverrides: {},
  threatColorsEnabled: true,
  threatOutlineVisible: true,
  threatOutlineWidth: THREAT_LINE_WIDTH,
  attackArc: {
    lengthThresholds: {
      shortMax: 18,
      mediumMax: 55,
    },
    presets: DEFAULT_ATTACK_ARC_LENGTH_PRESETS,
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

function coerceCountryCenterOverrides(value: unknown): Record<string, CountryCenterPoint> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const next: Record<string, CountryCenterPoint> = {};

  for (const [rawCode, rawPoint] of Object.entries(value)) {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      continue;
    }

    if (typeof rawPoint !== 'object' || rawPoint === null) {
      continue;
    }

    const point = rawPoint as Partial<CountryCenterPoint>;
    if (!isFiniteNumber(point.lon) || !isFiniteNumber(point.lat)) {
      continue;
    }

    next[code] = {
      lon: point.lon,
      lat: point.lat,
    };
  }

  return next;
}

function coerceLengthThresholds(value: unknown): AttackArcLengthThresholds {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcLengthThresholds> : {};
  const shortMax = isFiniteNumber(record.shortMax)
    ? clampNumber(record.shortMax, MIN_THRESHOLD, MAX_THRESHOLD)
    : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.lengthThresholds.shortMax;
  const mediumMax = isFiniteNumber(record.mediumMax)
    ? Math.max(shortMax, clampNumber(record.mediumMax, MIN_THRESHOLD, MAX_THRESHOLD))
    : DEFAULT_MAP_DEBUG_SETTINGS.attackArc.lengthThresholds.mediumMax;

  return { shortMax, mediumMax };
}

function coerceLengthPresetSettings(
  value: unknown,
  fallback: AttackArcLengthPresetSettings,
): AttackArcLengthPresetSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcLengthPresetSettings> : {};

  return {
    bundleCount: isFiniteNumber(record.bundleCount)
      ? Math.round(clampNumber(record.bundleCount, MIN_BUNDLE_COUNT, MAX_BUNDLE_COUNT))
      : fallback.bundleCount,
    flightDuration: isFiniteNumber(record.flightDuration)
      ? Math.round(clampNumber(record.flightDuration, MIN_DURATION, MAX_DURATION))
      : fallback.flightDuration,
    holdDuration: isFiniteNumber(record.holdDuration)
      ? Math.round(clampNumber(record.holdDuration, MIN_DURATION, MAX_DURATION))
      : fallback.holdDuration,
    fadeoutDuration: isFiniteNumber(record.fadeoutDuration)
      ? Math.round(clampNumber(record.fadeoutDuration, MIN_DURATION, MAX_DURATION))
      : fallback.fadeoutDuration,
    replayDelayMs: isFiniteNumber(record.replayDelayMs)
      ? Math.round(clampNumber(record.replayDelayMs, MIN_REPLAY_DELAY, MAX_REPLAY_DELAY))
      : fallback.replayDelayMs,
    bundleIntervalMs: isFiniteNumber(record.bundleIntervalMs)
      ? Math.round(clampNumber(record.bundleIntervalMs, MIN_DURATION, MAX_DURATION))
      : fallback.bundleIntervalMs,
    maxConcurrentStarts: isFiniteNumber(record.maxConcurrentStarts)
      ? Math.round(clampNumber(record.maxConcurrentStarts, MIN_MAX_CONCURRENT_STARTS, MAX_MAX_CONCURRENT_STARTS))
      : fallback.maxConcurrentStarts,
    stages: coerceStageSettingsRecord(record.stages, fallback.stages),
  };
}

function coerceStageSettings(
  value: unknown,
  fallback: AttackArcStageSettings,
): AttackArcStageSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcStageSettings> : {};

  return {
    bundleSpreadRatio: isFiniteNumber(record.bundleSpreadRatio)
      ? clampNumber(record.bundleSpreadRatio, MIN_SPREAD_RATIO, MAX_SPREAD_RATIO)
      : fallback.bundleSpreadRatio,
    curvatureRatio: isFiniteNumber(record.curvatureRatio)
      ? clampNumber(record.curvatureRatio, MIN_CURVATURE_RATIO, MAX_CURVATURE_RATIO)
      : fallback.curvatureRatio,
    lineWidth: isFiniteNumber(record.lineWidth)
      ? clampNumber(record.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH)
      : fallback.lineWidth,
    segmentCount: isFiniteNumber(record.segmentCount)
      ? Math.round(clampNumber(record.segmentCount, MIN_SEGMENT_COUNT, MAX_SEGMENT_COUNT))
      : fallback.segmentCount,
    ringRadius: isFiniteNumber(record.ringRadius)
      ? clampNumber(record.ringRadius, MIN_RING_RADIUS, MAX_RING_RADIUS)
      : fallback.ringRadius,
    ringCount: isFiniteNumber(record.ringCount)
      ? Math.round(clampNumber(record.ringCount, MIN_RING_COUNT, MAX_RING_COUNT))
      : fallback.ringCount,
    ringSpacing: isFiniteNumber(record.ringSpacing)
      ? clampNumber(record.ringSpacing, MIN_RING_SPACING, MAX_RING_SPACING)
      : fallback.ringSpacing,
    ringLineWidth: isFiniteNumber(record.ringLineWidth)
      ? clampNumber(record.ringLineWidth, MIN_RING_LINE_WIDTH, MAX_RING_LINE_WIDTH)
      : fallback.ringLineWidth,
    ringDotRadius: isFiniteNumber(record.ringDotRadius)
      ? clampNumber(record.ringDotRadius, MIN_RING_DOT_RADIUS, MAX_RING_DOT_RADIUS)
      : fallback.ringDotRadius,
  };
}

function coerceStageSettingsRecord(
  value: unknown,
  fallback: Record<AttackArcStagePreset, AttackArcStageSettings>,
): Record<AttackArcStagePreset, AttackArcStageSettings> {
  const record = typeof value === 'object' && value !== null
    ? value as Partial<Record<AttackArcStagePreset, AttackArcStageSettings>>
    : {};

  return {
    stage1: coerceStageSettings(record.stage1, fallback.stage1),
    stage2: coerceStageSettings(record.stage2, fallback.stage2),
    stage3: coerceStageSettings(record.stage3, fallback.stage3),
  };
}

function createLegacyStageSettings(
  value: unknown,
  fallback: AttackArcStageSettings,
  legacyAttackArcRecord?: Record<string, unknown>,
): AttackArcStageSettings {
  const legacyStage = coerceStageSettings(value, fallback);
  return {
    ...legacyStage,
    ringRadius: isFiniteNumber(legacyAttackArcRecord?.ringRadius)
      ? clampNumber(legacyAttackArcRecord.ringRadius, MIN_RING_RADIUS, MAX_RING_RADIUS)
      : legacyStage.ringRadius,
    ringCount: isFiniteNumber(legacyAttackArcRecord?.ringCount)
      ? Math.round(clampNumber(legacyAttackArcRecord.ringCount, MIN_RING_COUNT, MAX_RING_COUNT))
      : legacyStage.ringCount,
    ringSpacing: isFiniteNumber(legacyAttackArcRecord?.ringSpacing)
      ? clampNumber(legacyAttackArcRecord.ringSpacing, MIN_RING_SPACING, MAX_RING_SPACING)
      : legacyStage.ringSpacing,
    ringLineWidth: isFiniteNumber(legacyAttackArcRecord?.ringLineWidth)
      ? clampNumber(legacyAttackArcRecord.ringLineWidth, MIN_RING_LINE_WIDTH, MAX_RING_LINE_WIDTH)
      : legacyStage.ringLineWidth,
    ringDotRadius: isFiniteNumber(legacyAttackArcRecord?.ringDotRadius)
      ? clampNumber(legacyAttackArcRecord.ringDotRadius, MIN_RING_DOT_RADIUS, MAX_RING_DOT_RADIUS)
      : legacyStage.ringDotRadius,
  };
}

function coerceLegacyLengthPresetSettings(
  value: unknown,
  fallback: AttackArcLengthPresetSettings,
  legacyAttackArcRecord: Record<string, unknown>,
): AttackArcLengthPresetSettings {
  return {
    bundleCount: isFiniteNumber(legacyAttackArcRecord.bundleCount)
      ? Math.round(clampNumber(legacyAttackArcRecord.bundleCount, MIN_BUNDLE_COUNT, MAX_BUNDLE_COUNT))
      : fallback.bundleCount,
    flightDuration: isFiniteNumber(legacyAttackArcRecord.flightDuration)
      ? Math.round(clampNumber(legacyAttackArcRecord.flightDuration, MIN_DURATION, MAX_DURATION))
      : fallback.flightDuration,
    holdDuration: isFiniteNumber(legacyAttackArcRecord.holdDuration)
      ? Math.round(clampNumber(legacyAttackArcRecord.holdDuration, MIN_DURATION, MAX_DURATION))
      : fallback.holdDuration,
    fadeoutDuration: isFiniteNumber(legacyAttackArcRecord.fadeoutDuration)
      ? Math.round(clampNumber(legacyAttackArcRecord.fadeoutDuration, MIN_DURATION, MAX_DURATION))
      : fallback.fadeoutDuration,
    replayDelayMs: isFiniteNumber(legacyAttackArcRecord.replayDelayMs)
      ? Math.round(clampNumber(legacyAttackArcRecord.replayDelayMs, MIN_REPLAY_DELAY, MAX_REPLAY_DELAY))
      : fallback.replayDelayMs,
    bundleIntervalMs: isFiniteNumber(legacyAttackArcRecord.bundleIntervalMs)
      ? Math.round(clampNumber(legacyAttackArcRecord.bundleIntervalMs, MIN_DURATION, MAX_DURATION))
      : fallback.bundleIntervalMs,
    maxConcurrentStarts: isFiniteNumber(legacyAttackArcRecord.maxConcurrentStarts)
      ? Math.round(clampNumber(
        legacyAttackArcRecord.maxConcurrentStarts,
        MIN_MAX_CONCURRENT_STARTS,
        MAX_MAX_CONCURRENT_STARTS,
      ))
      : fallback.maxConcurrentStarts,
    stages: {
      stage1: createLegacyStageSettings(value, fallback.stages.stage1, legacyAttackArcRecord),
      stage2: createLegacyStageSettings(value, fallback.stages.stage2, legacyAttackArcRecord),
      stage3: createLegacyStageSettings(value, fallback.stages.stage3, legacyAttackArcRecord),
    },
  };
}

function coerceLengthPresets(
  value: unknown,
  legacyAttackArcRecord?: Record<string, unknown>,
): Record<ArcLengthPreset, AttackArcLengthPresetSettings> {
  const record = typeof value === 'object' && value !== null
    ? value as Partial<Record<ArcLengthPreset, AttackArcLengthPresetSettings>>
    : {};

  if (legacyAttackArcRecord) {
    return {
      short: coerceLegacyLengthPresetSettings(record.short, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.short, legacyAttackArcRecord),
      medium: coerceLegacyLengthPresetSettings(record.medium, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.medium, legacyAttackArcRecord),
      long: coerceLegacyLengthPresetSettings(record.long, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.long, legacyAttackArcRecord),
    };
  }

  return {
    short: coerceLengthPresetSettings(record.short, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.short),
    medium: coerceLengthPresetSettings(record.medium, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.medium),
    long: coerceLengthPresetSettings(record.long, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.long),
  };
}

function coerceAttackArcSettings(value: unknown): AttackArcDebugSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcDebugSettings> : {};
  const legacyRecord = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const hasLegacyLengthPresets = typeof legacyRecord?.lengthPresets === 'object' && legacyRecord.lengthPresets !== null;
  const presetsValue = record.presets ?? legacyRecord?.lengthPresets;

  return {
    lengthThresholds: coerceLengthThresholds(record.lengthThresholds),
    presets: coerceLengthPresets(presetsValue, hasLegacyLengthPresets ? legacyRecord ?? undefined : undefined),
  };
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
    countryCenterOverrides: coerceCountryCenterOverrides(record.countryCenterOverrides),
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

  const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
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
      countryCenterOverrides: patch.countryCenterOverrides ?? current.countryCenterOverrides,
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
