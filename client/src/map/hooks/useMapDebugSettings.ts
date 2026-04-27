import { useEffect, useRef, useState } from 'react';
import type {
  ArcLengthPreset,
  AttackArcConfigState,
  AttackArcDebugSettings,
  AttackArcLengthPresetSettings,
  AttackArcLengthThresholds,
  AttackArcStagePreset,
  AttackArcStageSettings,
  AttackArcVisualStyle,
  CountryCenterPoint,
  MapDebugSettings,
} from 'map/state/map-types';
import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_FILL_OPACITY,
  COUNTRY_BASE_GLOW_COLOR,
  COUNTRY_BASE_GLOW_OPACITY,
  COUNTRY_BASE_GLOW_WIDTH,
  COUNTRY_BASE_LINE_COLOR,
  COUNTRY_BASE_LINE_OPACITY,
  COUNTRY_BASE_LINE_WIDTH,
  HOVER_BORDER_WIDTH,
  THREAT_FILL_OPACITY,
  THREAT_GLOW_NEUTRAL_COLOR,
  THREAT_GLOW_OPACITY,
  THREAT_GLOW_WIDTH,
  THREAT_OUTLINE_NEUTRAL_COLOR,
  THREAT_LINE_WIDTH,
  THREAT_LINE_OPACITY,
} from 'map/layers/tokens';

const STORAGE_KEY = 'world-monitor.map-debug-settings.v16';
const LEGACY_STORAGE_KEY = 'world-monitor.map-debug-settings.v15';
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
const MIN_LINE_WIDTH = 0;
const MAX_LINE_WIDTH = 10;
const MIN_SEGMENT_COUNT = 12;
const MAX_SEGMENT_COUNT = 240;
const MIN_DURATION = 100;
const MAX_DURATION = 20000;
const MIN_REPLAY_DELAY = 1000;
const MAX_REPLAY_DELAY = 30000;
const MIN_MAX_CONCURRENT_STARTS = 1;
const MAX_MAX_CONCURRENT_STARTS = 12;
const MIN_THREAT_OUTLINE_WIDTH = 0;
const MAX_THREAT_OUTLINE_WIDTH = 12;
const MIN_BASE_COUNTRY_OUTLINE_WIDTH = 0;
const MAX_BASE_COUNTRY_OUTLINE_WIDTH = 8;
const MIN_GLOW_WIDTH = 0;
const MAX_GLOW_WIDTH = 24;
const MIN_HOVER_WIDTH = 0;
const MAX_HOVER_WIDTH = 24;
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
const MIN_ALPHA = 0;
const MAX_ALPHA = 1;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const INVALID_ATTACK_ARC_CONFIG_MESSAGE = 'AttackArc Debug 配置不完整，未应用已存样式。';

function createValidAttackArcConfigState(): AttackArcConfigState {
  return {
    isValid: true,
    errorMessage: null,
  };
}

function createInvalidAttackArcConfigState(): AttackArcConfigState {
  return {
    isValid: false,
    errorMessage: INVALID_ATTACK_ARC_CONFIG_MESSAGE,
  };
}

function resolveSafeRingSpacing(ringRadius: number, ringCount: number, ringSpacing: number): number {
  if (ringCount <= 1) {
    return ringRadius;
  }

  return Math.min(ringSpacing, Math.max(1, ringRadius / ringCount));
}

function createDefaultStageSettings(): AttackArcStageSettings {
  return {
    lineAlpha: 1,
    ringAlpha: 1,
    dotAlpha: 1,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
  };
}

function createDefaultVisualStyle(lineColor: string): AttackArcVisualStyle {
  return {
    lineColor,
    ringColor: lineColor,
    dotColor: lineColor,
  };
}

function createDefaultLengthPresetSettings(
  bundleSpreadRatio: number,
  curvatureRatio: number,
  lineWidth: number,
  segmentCount: number,
  style: AttackArcVisualStyle,
): AttackArcLengthPresetSettings {
  return {
    bundleCount: 2,
    flightDuration: 1300,
    holdDuration: 2000,
    fadeoutDuration: 700,
    replayDelayMs: 5000,
    bundleIntervalMs: 220,
    maxConcurrentStarts: 4,
    bundleSpreadRatio,
    curvatureRatio,
    lineWidth,
    segmentCount,
    style,
    stages: {
      stage1: createDefaultStageSettings(),
      stage2: createDefaultStageSettings(),
      stage3: createDefaultStageSettings(),
    },
  };
}

const DEFAULT_ATTACK_ARC_LENGTH_PRESETS: Record<ArcLengthPreset, AttackArcLengthPresetSettings> = {
  short: {
    ...createDefaultLengthPresetSettings(0.05, 0.08, 1.5, 64, createDefaultVisualStyle('#f5a623')),
    stages: {
      stage1: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 15,
        ringCount: 2,
        ringSpacing: 5,
        ringLineWidth: 2.5,
        ringDotRadius: 6,
      },
      stage2: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 9,
        ringCount: 2,
        ringSpacing: 3,
        ringLineWidth: 1.5,
        ringDotRadius: 2,
      },
      stage3: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 9,
        ringCount: 2,
        ringSpacing: 3,
        ringLineWidth: 1.5,
        ringDotRadius: 2,
      },
    },
  },
  medium: {
    ...createDefaultLengthPresetSettings(0.08, 0.16, 2, 100, createDefaultVisualStyle('#ff5f3c')),
    bundleCount: 3,
    stages: {
      stage1: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 9,
        ringCount: 1,
        ringSpacing: 9,
        ringLineWidth: 2,
        ringDotRadius: 1,
      },
      stage2: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 12,
        ringCount: 2,
        ringSpacing: 5,
        ringLineWidth: 2,
        ringDotRadius: 3,
      },
      stage3: {
        lineAlpha: 1,
        ringAlpha: 1,
        dotAlpha: 1,
        ringRadius: 15,
        ringCount: 2,
        ringSpacing: 5,
        ringLineWidth: 2.5,
        ringDotRadius: 6,
      },
    },
  },
  long: {
    ...createDefaultLengthPresetSettings(0.12, 0.24, 4, 140, createDefaultVisualStyle('#eb282d')),
    bundleCount: 1,
    maxConcurrentStarts: 5,
  },
};

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 339,
  minZoom: -2,
  maxZoom: 6,
  baseCountryFillColor: '#000000',
  baseCountryFillOpacity: 0.65,
  baseCountryOutlineColor: COUNTRY_BASE_LINE_COLOR,
  baseCountryOutlineWidth: COUNTRY_BASE_LINE_WIDTH,
  baseCountryOutlineOpacity: COUNTRY_BASE_LINE_OPACITY,
  baseCountryGlowColor: COUNTRY_BASE_GLOW_COLOR,
  baseCountryGlowWidth: COUNTRY_BASE_GLOW_WIDTH,
  baseCountryGlowOpacity: COUNTRY_BASE_GLOW_OPACITY,
  activeCountryCodes: [],
  countryCenterOverrides: {},
  threatColorsEnabled: false,
  threatFillOpacity: THREAT_FILL_OPACITY,
  threatOutlineVisible: false,
  threatOutlineNeutralColor: THREAT_OUTLINE_NEUTRAL_COLOR,
  threatOutlineWidth: 1.5,
  threatOutlineOpacity: THREAT_LINE_OPACITY,
  threatGlowNeutralColor: THREAT_GLOW_NEUTRAL_COLOR,
  threatGlowWidth: 3.2,
  threatGlowOpacity: THREAT_GLOW_OPACITY,
  hoverFillColor: '#34c8ff',
  hoverFillOpacity: 0.18,
  hoverThreatFillOpacity: 1,
  hoverGlowColor: '#34c8ff',
  hoverGlowWidth: 5.5,
  hoverGlowOpacity: 0.28,
  hoverThreatGlowOpacity: 1,
  hoverBorderColor: '#52d6ff',
  hoverBorderWidth: HOVER_BORDER_WIDTH,
  hoverBorderOpacity: 0.9,
  hoverThreatBorderOpacity: 1,
  attackArc: {
    lengthThresholds: {
      shortMax: 19,
      mediumMax: 74,
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

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim());
}

function coerceHexColor(value: unknown, fallback: string): string {
  return isHexColor(value) ? value.trim().toLowerCase() : fallback;
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

function coerceStageSettings(
  value: unknown,
  fallback: AttackArcStageSettings,
): AttackArcStageSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcStageSettings> : {};
  const lineAlpha = isFiniteNumber(record.lineAlpha)
    ? clampNumber(record.lineAlpha, MIN_ALPHA, MAX_ALPHA)
    : fallback.lineAlpha;
  const ringAlpha = isFiniteNumber(record.ringAlpha)
    ? clampNumber(record.ringAlpha, MIN_ALPHA, MAX_ALPHA)
    : fallback.ringAlpha;
  const dotAlpha = isFiniteNumber(record.dotAlpha)
    ? clampNumber(record.dotAlpha, MIN_ALPHA, MAX_ALPHA)
    : fallback.dotAlpha;
  const ringRadius = isFiniteNumber(record.ringRadius)
    ? clampNumber(record.ringRadius, MIN_RING_RADIUS, MAX_RING_RADIUS)
    : fallback.ringRadius;
  const ringCount = isFiniteNumber(record.ringCount)
    ? Math.round(clampNumber(record.ringCount, MIN_RING_COUNT, MAX_RING_COUNT))
    : fallback.ringCount;
  const rawRingSpacing = isFiniteNumber(record.ringSpacing)
    ? clampNumber(record.ringSpacing, MIN_RING_SPACING, MAX_RING_SPACING)
    : fallback.ringSpacing;

  return {
    lineAlpha,
    ringAlpha,
    dotAlpha,
    ringRadius,
    ringCount,
    ringSpacing: resolveSafeRingSpacing(ringRadius, ringCount, rawRingSpacing),
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

function coerceLengthPresetSettings(
  value: unknown,
  fallback: AttackArcLengthPresetSettings,
): AttackArcLengthPresetSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcLengthPresetSettings> : {};
  const styleRecord = typeof record.style === 'object' && record.style !== null
    ? record.style as Partial<AttackArcVisualStyle>
    : {};
  const lineWidth = isFiniteNumber(record.lineWidth)
    ? clampNumber(record.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH)
    : fallback.lineWidth;
  const segmentCount = isFiniteNumber(record.segmentCount)
    ? Math.round(clampNumber(record.segmentCount, MIN_SEGMENT_COUNT, MAX_SEGMENT_COUNT))
    : fallback.segmentCount;

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
    bundleSpreadRatio: isFiniteNumber(record.bundleSpreadRatio)
      ? clampNumber(record.bundleSpreadRatio, MIN_SPREAD_RATIO, MAX_SPREAD_RATIO)
      : fallback.bundleSpreadRatio,
    curvatureRatio: isFiniteNumber(record.curvatureRatio)
      ? clampNumber(record.curvatureRatio, MIN_CURVATURE_RATIO, MAX_CURVATURE_RATIO)
      : fallback.curvatureRatio,
    lineWidth,
    segmentCount,
    style: {
      lineColor: coerceHexColor(styleRecord.lineColor, fallback.style.lineColor),
      ringColor: coerceHexColor(styleRecord.ringColor, fallback.style.ringColor),
      dotColor: coerceHexColor(styleRecord.dotColor, fallback.style.dotColor),
    },
    stages: coerceStageSettingsRecord(record.stages, fallback.stages),
  };
}

function coerceLengthPresets(value: unknown): Record<ArcLengthPreset, AttackArcLengthPresetSettings> {
  const record = typeof value === 'object' && value !== null
    ? value as Partial<Record<ArcLengthPreset, AttackArcLengthPresetSettings>>
    : {};

  return {
    short: coerceLengthPresetSettings(record.short, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.short),
    medium: coerceLengthPresetSettings(record.medium, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.medium),
    long: coerceLengthPresetSettings(record.long, DEFAULT_ATTACK_ARC_LENGTH_PRESETS.long),
  };
}

function coerceAttackArcSettings(value: unknown): AttackArcDebugSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcDebugSettings> : {};
  return {
    lengthThresholds: coerceLengthThresholds(record.lengthThresholds),
    presets: coerceLengthPresets(record.presets),
  };
}

function isCompleteStageSettings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<AttackArcStageSettings>;
  return isFiniteNumber(record.lineAlpha)
    && isFiniteNumber(record.ringAlpha)
    && isFiniteNumber(record.dotAlpha)
    && isFiniteNumber(record.ringRadius)
    && isFiniteNumber(record.ringCount)
    && isFiniteNumber(record.ringSpacing)
    && isFiniteNumber(record.ringLineWidth)
    && isFiniteNumber(record.ringDotRadius);
}

function isCompleteVisualStyle(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<AttackArcVisualStyle>;
  return isHexColor(record.lineColor)
    && isHexColor(record.ringColor)
    && isHexColor(record.dotColor);
}

function isCompleteLengthPresetSettings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<AttackArcLengthPresetSettings>;
  const stages = record.stages as Partial<Record<AttackArcStagePreset, unknown>> | undefined;

  return isFiniteNumber(record.bundleCount)
    && isFiniteNumber(record.flightDuration)
    && isFiniteNumber(record.holdDuration)
    && isFiniteNumber(record.fadeoutDuration)
    && isFiniteNumber(record.replayDelayMs)
    && isFiniteNumber(record.bundleIntervalMs)
    && isFiniteNumber(record.maxConcurrentStarts)
    && isFiniteNumber(record.bundleSpreadRatio)
    && isFiniteNumber(record.curvatureRatio)
    && isFiniteNumber(record.lineWidth)
    && isFiniteNumber(record.segmentCount)
    && isCompleteVisualStyle(record.style)
    && !!stages
    && isCompleteStageSettings(stages.stage1)
    && isCompleteStageSettings(stages.stage2)
    && isCompleteStageSettings(stages.stage3);
}

function hasCompleteStoredAttackArcSettings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<AttackArcDebugSettings>;
  const presets = record.presets as Partial<Record<ArcLengthPreset, unknown>> | undefined;

  return typeof record.lengthThresholds === 'object'
    && record.lengthThresholds !== null
    && isFiniteNumber((record.lengthThresholds as Partial<AttackArcLengthThresholds>).shortMax)
    && isFiniteNumber((record.lengthThresholds as Partial<AttackArcLengthThresholds>).mediumMax)
    && !!presets
    && isCompleteLengthPresetSettings(presets.short)
    && isCompleteLengthPresetSettings(presets.medium)
    && isCompleteLengthPresetSettings(presets.long);
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
    baseCountryFillColor: coerceHexColor(
      record.baseCountryFillColor,
      DEFAULT_MAP_DEBUG_SETTINGS.baseCountryFillColor,
    ),
    baseCountryFillOpacity: isFiniteNumber(record.baseCountryFillOpacity)
      ? clampNumber(record.baseCountryFillOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.baseCountryFillOpacity,
    baseCountryOutlineColor: coerceHexColor(
      record.baseCountryOutlineColor,
      DEFAULT_MAP_DEBUG_SETTINGS.baseCountryOutlineColor,
    ),
    baseCountryOutlineWidth: isFiniteNumber(record.baseCountryOutlineWidth)
      ? clampNumber(record.baseCountryOutlineWidth, MIN_BASE_COUNTRY_OUTLINE_WIDTH, MAX_BASE_COUNTRY_OUTLINE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.baseCountryOutlineWidth,
    baseCountryOutlineOpacity: isFiniteNumber(record.baseCountryOutlineOpacity)
      ? clampNumber(record.baseCountryOutlineOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.baseCountryOutlineOpacity,
    baseCountryGlowColor: coerceHexColor(
      record.baseCountryGlowColor,
      DEFAULT_MAP_DEBUG_SETTINGS.baseCountryGlowColor,
    ),
    baseCountryGlowWidth: isFiniteNumber(record.baseCountryGlowWidth)
      ? clampNumber(record.baseCountryGlowWidth, MIN_GLOW_WIDTH, MAX_GLOW_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.baseCountryGlowWidth,
    baseCountryGlowOpacity: isFiniteNumber(record.baseCountryGlowOpacity)
      ? clampNumber(record.baseCountryGlowOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.baseCountryGlowOpacity,
    activeCountryCodes: normalizeActiveCountryCodes(record.activeCountryCodes),
    countryCenterOverrides: coerceCountryCenterOverrides(record.countryCenterOverrides),
    threatColorsEnabled: coerceBoolean(record.threatColorsEnabled, DEFAULT_MAP_DEBUG_SETTINGS.threatColorsEnabled),
    threatFillOpacity: isFiniteNumber(record.threatFillOpacity)
      ? clampNumber(record.threatFillOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatFillOpacity,
    threatOutlineVisible: coerceBoolean(record.threatOutlineVisible, DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineVisible),
    threatOutlineNeutralColor: coerceHexColor(
      record.threatOutlineNeutralColor,
      DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineNeutralColor,
    ),
    threatOutlineWidth: isFiniteNumber(record.threatOutlineWidth)
      ? clampNumber(record.threatOutlineWidth, MIN_THREAT_OUTLINE_WIDTH, MAX_THREAT_OUTLINE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineWidth,
    threatOutlineOpacity: isFiniteNumber(record.threatOutlineOpacity)
      ? clampNumber(record.threatOutlineOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatOutlineOpacity,
    threatGlowNeutralColor: coerceHexColor(
      record.threatGlowNeutralColor,
      DEFAULT_MAP_DEBUG_SETTINGS.threatGlowNeutralColor,
    ),
    threatGlowWidth: isFiniteNumber(record.threatGlowWidth)
      ? clampNumber(record.threatGlowWidth, MIN_GLOW_WIDTH, MAX_GLOW_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatGlowWidth,
    threatGlowOpacity: isFiniteNumber(record.threatGlowOpacity)
      ? clampNumber(record.threatGlowOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.threatGlowOpacity,
    hoverFillColor: coerceHexColor(
      record.hoverFillColor,
      DEFAULT_MAP_DEBUG_SETTINGS.hoverFillColor,
    ),
    hoverFillOpacity: isFiniteNumber(record.hoverFillOpacity)
      ? clampNumber(record.hoverFillOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverFillOpacity,
    hoverThreatFillOpacity: isFiniteNumber(record.hoverThreatFillOpacity)
      ? clampNumber(record.hoverThreatFillOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverThreatFillOpacity,
    hoverGlowColor: coerceHexColor(
      record.hoverGlowColor,
      DEFAULT_MAP_DEBUG_SETTINGS.hoverGlowColor,
    ),
    hoverGlowWidth: isFiniteNumber(record.hoverGlowWidth)
      ? clampNumber(record.hoverGlowWidth, MIN_HOVER_WIDTH, MAX_HOVER_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverGlowWidth,
    hoverGlowOpacity: isFiniteNumber(record.hoverGlowOpacity)
      ? clampNumber(record.hoverGlowOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverGlowOpacity,
    hoverThreatGlowOpacity: isFiniteNumber(record.hoverThreatGlowOpacity)
      ? clampNumber(record.hoverThreatGlowOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverThreatGlowOpacity,
    hoverBorderColor: coerceHexColor(
      record.hoverBorderColor,
      DEFAULT_MAP_DEBUG_SETTINGS.hoverBorderColor,
    ),
    hoverBorderWidth: isFiniteNumber(record.hoverBorderWidth)
      ? clampNumber(record.hoverBorderWidth, MIN_HOVER_WIDTH, MAX_HOVER_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverBorderWidth,
    hoverBorderOpacity: isFiniteNumber(record.hoverBorderOpacity)
      ? clampNumber(record.hoverBorderOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverBorderOpacity,
    hoverThreatBorderOpacity: isFiniteNumber(record.hoverThreatBorderOpacity)
      ? clampNumber(record.hoverThreatBorderOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.hoverThreatBorderOpacity,
    attackArc: coerceAttackArcSettings(record.attackArc),
  };
}

interface StoredMapDebugSettingsResult {
  settings: MapDebugSettings;
  attackArcConfigState: AttackArcConfigState;
  skipInitialPersist: boolean;
}

export function coerceStoredMapDebugSettings(value: unknown): StoredMapDebugSettingsResult {
  const settings = coerceMapDebugSettings(value);
  if (typeof value !== 'object' || value === null) {
    return {
      settings,
      attackArcConfigState: createValidAttackArcConfigState(),
      skipInitialPersist: false,
    };
  }

  const record = value as Partial<MapDebugSettings>;
  if (hasCompleteStoredAttackArcSettings(record.attackArc)) {
    return {
      settings,
      attackArcConfigState: createValidAttackArcConfigState(),
      skipInitialPersist: false,
    };
  }

  return {
    settings: {
      ...settings,
      attackArc: DEFAULT_MAP_DEBUG_SETTINGS.attackArc,
    },
    attackArcConfigState: createInvalidAttackArcConfigState(),
    skipInitialPersist: true,
  };
}

function readStoredSettings(): StoredMapDebugSettingsResult | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return coerceStoredMapDebugSettings(JSON.parse(raw));
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
  attackArcConfigState: AttackArcConfigState;
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
  const [attackArcConfigState, setAttackArcConfigState] = useState<AttackArcConfigState>(createValidAttackArcConfigState());
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    const stored = readStoredSettings();
    if (stored) {
      setSettings(stored.settings);
      setAttackArcConfigState(stored.attackArcConfigState);
      setPersistEnabledState(true);
      skipNextPersistRef.current = stored.skipInitialPersist;
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

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
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
    if (patch.attackArc) {
      setAttackArcConfigState(createValidAttackArcConfigState());
    }

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

  const resetSettings = () => {
    setSettings(DEFAULT_MAP_DEBUG_SETTINGS);
    setAttackArcConfigState(createValidAttackArcConfigState());
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
    attackArcConfigState,
    resetSettings,
    updateLatestSectionHeight,
    updateMapSettings,
    updateActiveCountryCodes,
  };
}
