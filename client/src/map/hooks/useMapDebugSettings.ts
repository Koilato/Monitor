import { useEffect, useRef, useState } from 'react';
import type {
  ArcLengthPreset,
  AttackArcBundleMode,
  AttackArcConfigState,
  AttackArcCurveType,
  AttackArcDebugSettings,
  AttackArcLengthPresetSettings,
  AttackArcLengthThresholds,
  AttackArcStagePreset,
  AttackArcStageSettings,
  AttackArcVisualLevel,
  AttackArcVisualStyle,
  CountryCenterPoint,
  MapDebugSettings,
  TrafficStatsDebugSettings,
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

const STORAGE_KEY = 'world-monitor.map-debug-settings.v19';
const LEGACY_STORAGE_KEYS = [
  'world-monitor.map-debug-settings.v18',
  'world-monitor.map-debug-settings.v17',
  'world-monitor.map-debug-settings.v16',
] as const;
const DEBUG_MODE_STORAGE_KEY = 'world-monitor.map-debug-mode.v1';
const LATEST_SECTION_HEIGHT_MIN = 100;
const LATEST_SECTION_HEIGHT_MAX = 560;
const MIN_MIN_ZOOM = -6;
const MAX_MAX_ZOOM = 10;
const MIN_TRAFFIC_UI_SCALE = 0.55;
const MAX_TRAFFIC_UI_SCALE = 1.2;
const MIN_TRAFFIC_TREND_PANEL_WIDTH = 220;
const MAX_TRAFFIC_TREND_PANEL_WIDTH = 720;
const MIN_TRAFFIC_BARS_PANEL_WIDTH = 280;
const MAX_TRAFFIC_BARS_PANEL_WIDTH = 1200;
const MIN_TRAFFIC_ORIGINS_WIDTH = 180;
const MAX_TRAFFIC_ORIGINS_WIDTH = 420;
const MIN_TRAFFIC_PANEL_PADDING = 8;
const MAX_TRAFFIC_PANEL_PADDING = 40;
const MIN_TRAFFIC_PANEL_TOP_PADDING = 0;
const MAX_TRAFFIC_PANEL_TOP_PADDING = 32;
const MIN_TRAFFIC_BAR_GAP = 4;
const MAX_TRAFFIC_BAR_GAP = 20;
const MIN_TRAFFIC_BAR_COUNT = 4;
const MAX_TRAFFIC_BAR_COUNT = 16;
const MIN_TRAFFIC_BAR_WIDTH = 12;
const MAX_TRAFFIC_BAR_WIDTH = 80;
const MIN_TRAFFIC_COUNTRY_LABEL_SCALE = 0.7;
const MAX_TRAFFIC_COUNTRY_LABEL_SCALE = 1.8;
const MIN_TRAFFIC_TREND_AXIS_LABEL_SCALE = 0.7;
const MAX_TRAFFIC_TREND_AXIS_LABEL_SCALE = 1.8;
const MIN_TRAFFIC_TREND_AREA_OPACITY = 0.05;
const MAX_TRAFFIC_TREND_AREA_OPACITY = 0.6;
const MIN_TRAFFIC_TREND_STROKE_WIDTH = 1;
const MAX_TRAFFIC_TREND_STROKE_WIDTH = 4;
const MIN_TRAFFIC_SUMMARY_VALUE_SCALE = 0.7;
const MAX_TRAFFIC_SUMMARY_VALUE_SCALE = 1.8;
const MIN_TRAFFIC_ORIGIN_COUNT = 1;
const MAX_TRAFFIC_ORIGIN_COUNT = 8;
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
const MIN_PATH_SAMPLING_COUNT = 12;
const MAX_PATH_SAMPLING_COUNT = 360;
const MIN_ARC_HEIGHT_PX = 0;
const MAX_ARC_HEIGHT_PX = 500;
const MIN_ARC_HEIGHT_RATIO = 0;
const MAX_ARC_HEIGHT_RATIO = 0.8;
const MIN_CONTROL_INSET_RATIO = 0.05;
const MAX_CONTROL_INSET_RATIO = 0.95;
const MIN_BUNDLE_HEIGHT_STEP_PX = -80;
const MAX_BUNDLE_HEIGHT_STEP_PX = 80;
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
const MIN_COUNTRY_DOT_PATTERN_DENSITY = 8;
const MAX_COUNTRY_DOT_PATTERN_DENSITY = 24;
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
    curveType: 'cubic',
    pathSamplingCount: segmentCount,
    minArcHeightPx: 24,
    maxArcHeightPx: 180,
    arcHeightRatio: curvatureRatio,
    controlInsetRatio: 0.34,
    lengthBasedProgress: true,
    bundleMode: 'pulse-same-path',
    bundleHeightStepPx: 3,
    bundleAlphaStep: 0.08,
    dedupeTargetRings: true,
    stages: {
      stage1: createDefaultStageSettings(),
      stage2: createDefaultStageSettings(),
      stage3: createDefaultStageSettings(),
    },
  };
}

const DEFAULT_ATTACK_ARC_LENGTH_PRESETS: Record<ArcLengthPreset, AttackArcLengthPresetSettings> = {
  short: {
    ...createDefaultLengthPresetSettings(0.05, 0.08, 1.5, 64),
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
    ...createDefaultLengthPresetSettings(0.08, 0.16, 2, 100),
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
    ...createDefaultLengthPresetSettings(0.12, 0.24, 4, 140),
    bundleCount: 1,
    maxConcurrentStarts: 5,
  },
};

const DEFAULT_ATTACK_ARC_VISUAL_STYLES: Record<AttackArcVisualLevel, AttackArcVisualStyle> = {
  low: createDefaultVisualStyle('#14b8a6'),
  medium: createDefaultVisualStyle('#ffb72e'),
  high: createDefaultVisualStyle('#ff1d24'),
};

const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 339,
  trafficStats: {
    uiScale: 0.76,
    trendPanelWidth: 500,
    barsPanelWidth: 800,
    originsPanelWidth: 236,
    panelPaddingX: 18,
    panelPaddingTop: 8,
    panelPaddingBottom: 16,
    barGap: 8,
    barCount: 10,
    barWidth: 36,
    countryLabelScale: 1,
    trendAxisLabelScale: 1,
    trendAreaOpacity: 0.22,
    trendStrokeWidth: 2,
    summaryValueScale: 1,
    originCount: 3,
  },
  minZoom: -2,
  maxZoom: 6,
  countryDotPatternEnabled: true,
  countryDotPatternColor: '#7a7a7a',
  countryDotPatternDensity: 16,
  countryDotPatternOpacity: 0.36,
  baseCountryFillColor: '#000000',
  baseCountryFillOpacity: 0.65,
  baseCountryOutlineColor: COUNTRY_BASE_LINE_COLOR,
  baseCountryOutlineWidth: COUNTRY_BASE_LINE_WIDTH,
  baseCountryOutlineOpacity: COUNTRY_BASE_LINE_OPACITY,
  baseCountryGlowColor: COUNTRY_BASE_GLOW_COLOR,
  baseCountryGlowWidth: COUNTRY_BASE_GLOW_WIDTH,
  baseCountryGlowOpacity: COUNTRY_BASE_GLOW_OPACITY,
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
    visualStyles: DEFAULT_ATTACK_ARC_VISUAL_STYLES,
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

function coerceCurveType(value: unknown, fallback: AttackArcCurveType): AttackArcCurveType {
  return value === 'quadratic' || value === 'cubic' ? value : fallback;
}

function coerceBundleMode(value: unknown, fallback: AttackArcBundleMode): AttackArcBundleMode {
  return value === 'split-path' || value === 'pulse-same-path' ? value : fallback;
}

function coerceTrafficStatsSettings(value: unknown): TrafficStatsDebugSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_MAP_DEBUG_SETTINGS.trafficStats;
  }

  const record = value as Partial<TrafficStatsDebugSettings>;

  return {
    uiScale: isFiniteNumber(record.uiScale)
      ? clampNumber(record.uiScale, MIN_TRAFFIC_UI_SCALE, MAX_TRAFFIC_UI_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.uiScale,
    trendPanelWidth: isFiniteNumber(record.trendPanelWidth)
      ? clampNumber(record.trendPanelWidth, MIN_TRAFFIC_TREND_PANEL_WIDTH, MAX_TRAFFIC_TREND_PANEL_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.trendPanelWidth,
    barsPanelWidth: isFiniteNumber(record.barsPanelWidth)
      ? clampNumber(record.barsPanelWidth, MIN_TRAFFIC_BARS_PANEL_WIDTH, MAX_TRAFFIC_BARS_PANEL_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.barsPanelWidth,
    originsPanelWidth: isFiniteNumber(record.originsPanelWidth)
      ? clampNumber(record.originsPanelWidth, MIN_TRAFFIC_ORIGINS_WIDTH, MAX_TRAFFIC_ORIGINS_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.originsPanelWidth,
    panelPaddingX: isFiniteNumber(record.panelPaddingX)
      ? clampNumber(record.panelPaddingX, MIN_TRAFFIC_PANEL_PADDING, MAX_TRAFFIC_PANEL_PADDING)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.panelPaddingX,
    panelPaddingTop: isFiniteNumber(record.panelPaddingTop)
      ? clampNumber(record.panelPaddingTop, MIN_TRAFFIC_PANEL_TOP_PADDING, MAX_TRAFFIC_PANEL_TOP_PADDING)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.panelPaddingTop,
    panelPaddingBottom: isFiniteNumber(record.panelPaddingBottom)
      ? clampNumber(record.panelPaddingBottom, MIN_TRAFFIC_PANEL_PADDING, MAX_TRAFFIC_PANEL_PADDING)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.panelPaddingBottom,
    barGap: isFiniteNumber(record.barGap)
      ? clampNumber(record.barGap, MIN_TRAFFIC_BAR_GAP, MAX_TRAFFIC_BAR_GAP)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.barGap,
    barCount: isFiniteNumber(record.barCount)
      ? clampNumber(record.barCount, MIN_TRAFFIC_BAR_COUNT, MAX_TRAFFIC_BAR_COUNT)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.barCount,
    barWidth: isFiniteNumber(record.barWidth)
      ? clampNumber(record.barWidth, MIN_TRAFFIC_BAR_WIDTH, MAX_TRAFFIC_BAR_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.barWidth,
    countryLabelScale: isFiniteNumber(record.countryLabelScale)
      ? clampNumber(record.countryLabelScale, MIN_TRAFFIC_COUNTRY_LABEL_SCALE, MAX_TRAFFIC_COUNTRY_LABEL_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.countryLabelScale,
    trendAxisLabelScale: isFiniteNumber(record.trendAxisLabelScale)
      ? clampNumber(record.trendAxisLabelScale, MIN_TRAFFIC_TREND_AXIS_LABEL_SCALE, MAX_TRAFFIC_TREND_AXIS_LABEL_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.trendAxisLabelScale,
    trendAreaOpacity: isFiniteNumber(record.trendAreaOpacity)
      ? clampNumber(record.trendAreaOpacity, MIN_TRAFFIC_TREND_AREA_OPACITY, MAX_TRAFFIC_TREND_AREA_OPACITY)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.trendAreaOpacity,
    trendStrokeWidth: isFiniteNumber(record.trendStrokeWidth)
      ? clampNumber(record.trendStrokeWidth, MIN_TRAFFIC_TREND_STROKE_WIDTH, MAX_TRAFFIC_TREND_STROKE_WIDTH)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.trendStrokeWidth,
    summaryValueScale: isFiniteNumber(record.summaryValueScale)
      ? clampNumber(record.summaryValueScale, MIN_TRAFFIC_SUMMARY_VALUE_SCALE, MAX_TRAFFIC_SUMMARY_VALUE_SCALE)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.summaryValueScale,
    originCount: isFiniteNumber(record.originCount)
      ? clampNumber(record.originCount, MIN_TRAFFIC_ORIGIN_COUNT, MAX_TRAFFIC_ORIGIN_COUNT)
      : DEFAULT_MAP_DEBUG_SETTINGS.trafficStats.originCount,
  };
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

function coerceVisualStyle(
  value: unknown,
  fallback: AttackArcVisualStyle,
): AttackArcVisualStyle {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcVisualStyle> : {};
  return {
    lineColor: coerceHexColor(record.lineColor, fallback.lineColor),
    ringColor: coerceHexColor(record.ringColor, fallback.ringColor),
    dotColor: coerceHexColor(record.dotColor, fallback.dotColor),
  };
}

function coerceVisualStyles(
  value: unknown,
): Record<AttackArcVisualLevel, AttackArcVisualStyle> {
  const record = typeof value === 'object' && value !== null
    ? value as Partial<Record<AttackArcVisualLevel, AttackArcVisualStyle>>
    : {};

  return {
    low: coerceVisualStyle(record.low, DEFAULT_ATTACK_ARC_VISUAL_STYLES.low),
    medium: coerceVisualStyle(record.medium, DEFAULT_ATTACK_ARC_VISUAL_STYLES.medium),
    high: coerceVisualStyle(record.high, DEFAULT_ATTACK_ARC_VISUAL_STYLES.high),
  };
}

function coerceLengthPresetSettings(
  value: unknown,
  fallback: AttackArcLengthPresetSettings,
): AttackArcLengthPresetSettings {
  const record = typeof value === 'object' && value !== null ? value as Partial<AttackArcLengthPresetSettings> : {};
  const lineWidth = isFiniteNumber(record.lineWidth)
    ? clampNumber(record.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH)
    : fallback.lineWidth;
  const segmentCount = isFiniteNumber(record.segmentCount)
    ? Math.round(clampNumber(record.segmentCount, MIN_SEGMENT_COUNT, MAX_SEGMENT_COUNT))
    : fallback.segmentCount;
  const minArcHeightPx = isFiniteNumber(record.minArcHeightPx)
    ? clampNumber(record.minArcHeightPx, MIN_ARC_HEIGHT_PX, MAX_ARC_HEIGHT_PX)
    : fallback.minArcHeightPx;
  const maxArcHeightPx = isFiniteNumber(record.maxArcHeightPx)
    ? Math.max(minArcHeightPx, clampNumber(record.maxArcHeightPx, MIN_ARC_HEIGHT_PX, MAX_ARC_HEIGHT_PX))
    : fallback.maxArcHeightPx;

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
    curveType: coerceCurveType(record.curveType, fallback.curveType),
    pathSamplingCount: isFiniteNumber(record.pathSamplingCount)
      ? Math.round(clampNumber(record.pathSamplingCount, MIN_PATH_SAMPLING_COUNT, MAX_PATH_SAMPLING_COUNT))
      : fallback.pathSamplingCount,
    minArcHeightPx,
    maxArcHeightPx,
    arcHeightRatio: isFiniteNumber(record.arcHeightRatio)
      ? clampNumber(record.arcHeightRatio, MIN_ARC_HEIGHT_RATIO, MAX_ARC_HEIGHT_RATIO)
      : fallback.arcHeightRatio,
    controlInsetRatio: isFiniteNumber(record.controlInsetRatio)
      ? clampNumber(record.controlInsetRatio, MIN_CONTROL_INSET_RATIO, MAX_CONTROL_INSET_RATIO)
      : fallback.controlInsetRatio,
    lengthBasedProgress: coerceBoolean(record.lengthBasedProgress, fallback.lengthBasedProgress),
    bundleMode: coerceBundleMode(record.bundleMode, fallback.bundleMode),
    bundleHeightStepPx: isFiniteNumber(record.bundleHeightStepPx)
      ? clampNumber(record.bundleHeightStepPx, MIN_BUNDLE_HEIGHT_STEP_PX, MAX_BUNDLE_HEIGHT_STEP_PX)
      : fallback.bundleHeightStepPx,
    bundleAlphaStep: isFiniteNumber(record.bundleAlphaStep)
      ? clampNumber(record.bundleAlphaStep, MIN_ALPHA, MAX_ALPHA)
      : fallback.bundleAlphaStep,
    dedupeTargetRings: coerceBoolean(record.dedupeTargetRings, fallback.dedupeTargetRings),
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
    visualStyles: coerceVisualStyles(record.visualStyles),
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
    trafficStats: coerceTrafficStatsSettings(record.trafficStats),
    minZoom,
    maxZoom,
    countryDotPatternEnabled: coerceBoolean(
      record.countryDotPatternEnabled,
      DEFAULT_MAP_DEBUG_SETTINGS.countryDotPatternEnabled,
    ),
    countryDotPatternColor: coerceHexColor(
      record.countryDotPatternColor,
      DEFAULT_MAP_DEBUG_SETTINGS.countryDotPatternColor,
    ),
    countryDotPatternDensity: isFiniteNumber(record.countryDotPatternDensity)
      ? Math.round(clampNumber(
        record.countryDotPatternDensity,
        MIN_COUNTRY_DOT_PATTERN_DENSITY,
        MAX_COUNTRY_DOT_PATTERN_DENSITY,
      ))
      : DEFAULT_MAP_DEBUG_SETTINGS.countryDotPatternDensity,
    countryDotPatternOpacity: isFiniteNumber(record.countryDotPatternOpacity)
      ? clampNumber(record.countryDotPatternOpacity, MIN_ALPHA, MAX_ALPHA)
      : DEFAULT_MAP_DEBUG_SETTINGS.countryDotPatternOpacity,
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

  const raw = window.localStorage.getItem(STORAGE_KEY)
    ?? LEGACY_STORAGE_KEYS
      .map((key) => window.localStorage.getItem(key))
      .find((value) => Boolean(value));
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
  updateMapSettings: (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight'>>) => void;
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

  const updateMapSettings = (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight'>>) => {
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
  };
}
