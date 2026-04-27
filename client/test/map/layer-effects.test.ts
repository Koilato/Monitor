import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCountriesBaseState,
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
  buildThreatPatternExpression,
} from '../../src/map/layers/effects';
import {
  COUNTRY_DOT_PATTERN_FALLBACK_IMAGE_ID,
  COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
} from '../../src/map/layers/patterns';
import {
  registerCountriesBaseLayers,
  registerThreatHighlightLayers,
} from '../../src/map/layers/maplibre';
import {
  COUNTRY_BASE_FILL_COLOR,
  THREAT_GLOW_NEUTRAL_COLOR,
  THREAT_OUTLINE_NEUTRAL_COLOR,
  THREAT_VISUAL_LEVEL_TOKENS,
  resolveThreatVisualLevel,
} from '../../src/map/layers/tokens';

function createPreset(bundleSpreadRatio: number, curvatureRatio: number, lineWidth: number, segmentCount: number) {
  const stage = {
    lineAlpha: 1,
    ringAlpha: 1,
    dotAlpha: 1,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
  };

  return {
    bundleCount: 4,
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
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

function createVisualStyles() {
  return {
    low: {
      lineColor: '#14b8a6',
      ringColor: '#14b8a6',
      dotColor: '#14b8a6',
    },
    medium: {
      lineColor: '#ffb72e',
      ringColor: '#ffb72e',
      dotColor: '#ffb72e',
    },
    high: {
      lineColor: '#ff1d24',
      ringColor: '#ff1d24',
      dotColor: '#ff1d24',
    },
  };
}

function createDebugSettings() {
  return {
    latestSectionHeight: 160,
    minZoom: -2,
    maxZoom: 6,
    countryDotPatternEnabled: true,
    countryDotPatternColor: '#7a7a7a',
    countryDotPatternDensity: 16,
    countryDotPatternOpacity: 0.36,
    baseCountryFillColor: '#141414',
    baseCountryFillOpacity: 1,
    baseCountryOutlineColor: '#707070',
    baseCountryOutlineWidth: 0.9,
    baseCountryOutlineOpacity: 1,
    baseCountryGlowColor: '#707070',
    baseCountryGlowWidth: 0,
    baseCountryGlowOpacity: 0,
    countryCenterOverrides: {},
    threatColorsEnabled: true,
    threatFillOpacity: 1,
    threatOutlineVisible: true,
    threatOutlineNeutralColor: '#707070',
    threatOutlineWidth: 1.8,
    threatOutlineOpacity: 1,
    threatGlowNeutralColor: '#707070',
    threatGlowWidth: 6.4,
    threatGlowOpacity: 1,
    hoverFillColor: '#34c8ff',
    hoverFillOpacity: 0.18,
    hoverThreatFillOpacity: 1,
    hoverGlowColor: '#34c8ff',
    hoverGlowWidth: 5.5,
    hoverGlowOpacity: 0.28,
    hoverThreatGlowOpacity: 1,
    hoverBorderColor: '#52d6ff',
    hoverBorderWidth: 2.2,
    hoverBorderOpacity: 0.9,
    hoverThreatBorderOpacity: 1,
    attackArc: {
      lengthThresholds: {
        shortMax: 18,
        mediumMax: 55,
      },
      visualStyles: createVisualStyles(),
      presets: {
        short: createPreset(0.05, 0.08, 1.5, 64),
        medium: createPreset(0.08, 0.16, 1.8, 100),
        long: createPreset(0.12, 0.24, 2.2, 140),
      },
    },
  };
}

test('builds a maplibre match expression from threat data', () => {
  assert.deepEqual(buildThreatColorExpression({
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 4,
    countries: [
      {
        country: 'US',
        incidentCount: 2,
        severityCounts: { low: 0, medium: 1, high: 1 },
        eventLevel: 'medium',
      },
      {
        country: 'CN',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 0, high: 1 },
        eventLevel: 'high',
      },
      {
        country: 'RU',
        incidentCount: 1,
        severityCounts: { low: 1, medium: 0, high: 0 },
        eventLevel: 'low',
      },
    ],
  }), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_VISUAL_LEVEL_TOKENS.medium.fill,
    'CN',
    THREAT_VISUAL_LEVEL_TOKENS.critical.fill,
    'RU',
    THREAT_VISUAL_LEVEL_TOKENS.low.fill,
    'rgba(0,0,0,0)',
  ]);
});

test('returns a transparent fallback threat color when no countries are present', () => {
  assert.equal(buildThreatColorExpression({
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 0,
    countries: [],
  }), 'rgba(0,0,0,0)');
});

test('builds neutral threat expressions when threat colors are disabled', () => {
  const threatData = {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 2,
    countries: [
      {
        country: 'US',
        incidentCount: 1,
        severityCounts: { low: 1, medium: 0, high: 0 },
        eventLevel: 'low' as const,
      },
      {
        country: 'CN',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 1, high: 0 },
        eventLevel: 'medium' as const,
      },
    ],
  };

  assert.deepEqual(buildThreatColorExpression(threatData, false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    COUNTRY_BASE_FILL_COLOR,
    'CN',
    COUNTRY_BASE_FILL_COLOR,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatOutlineColorExpression(threatData, false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_OUTLINE_NEUTRAL_COLOR,
    'CN',
    THREAT_OUTLINE_NEUTRAL_COLOR,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_GLOW_NEUTRAL_COLOR,
    'CN',
    THREAT_GLOW_NEUTRAL_COLOR,
    'rgba(0,0,0,0)',
  ]);
});

test('builds outline and glow expressions from threat data', () => {
  const threatData = {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 3,
    countries: [
      {
        country: 'US',
        incidentCount: 2,
        severityCounts: { low: 0, medium: 1, high: 1 },
        eventLevel: 'medium' as const,
      },
      {
        country: 'CN',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 0, high: 1 },
        eventLevel: 'high' as const,
      },
    ],
  };

  assert.deepEqual(buildThreatOutlineColorExpression(threatData), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_VISUAL_LEVEL_TOKENS.medium.stroke,
    'CN',
    THREAT_VISUAL_LEVEL_TOKENS.critical.stroke,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_VISUAL_LEVEL_TOKENS.medium.glow,
    'CN',
    THREAT_VISUAL_LEVEL_TOKENS.critical.glow,
    'rgba(0,0,0,0)',
  ]);
});

test('builds threat pattern expressions from threat data', () => {
  const threatData = {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 2,
    countries: [
      {
        country: 'US',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 1, high: 0 },
        eventLevel: 'medium' as const,
      },
      {
        country: 'CN',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 0, high: 1 },
        eventLevel: 'high' as const,
      },
    ],
  };

  assert.deepEqual(buildThreatPatternExpression(threatData), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    'country-dot-pattern-threat-medium',
    'CN',
    'country-dot-pattern-threat-high',
    COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
  ]);
});

test('builds fallback threat pattern expressions when threat colors are disabled', () => {
  const threatData = {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 1,
    countries: [
      {
        country: 'GB',
        incidentCount: 1,
        severityCounts: { low: 1, medium: 0, high: 0 },
        eventLevel: 'low' as const,
      },
    ],
  };

  assert.deepEqual(buildThreatPatternExpression(threatData, false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'GB',
    COUNTRY_DOT_PATTERN_FALLBACK_IMAGE_ID,
    COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
  ]);
});

test('resolves visual levels directly from event levels', () => {
  assert.equal(resolveThreatVisualLevel('low'), 'low');
  assert.equal(resolveThreatVisualLevel('medium'), 'medium');
  assert.equal(resolveThreatVisualLevel('high'), 'critical');
});

test('applies threat outline width and visibility state', async () => {
  const calls: Array<{ type: string; id: string; key: string; value: unknown }> = [];
  const map = {
    getLayer(id: string) {
      return id === 'countries-threat-line' ? {} : undefined;
    },
    setLayoutProperty(id: string, key: string, value: unknown) {
      calls.push({ type: 'layout', id, key, value });
    },
    setPaintProperty(id: string, key: string, value: unknown) {
      calls.push({ type: 'paint', id, key, value });
    },
  };

  const context = {
    map: map as never,
    activeLayerIds: ['threat-highlight'],
    debugSettings: {
      ...createDebugSettings(),
      threatOutlineVisible: false,
      threatOutlineNeutralColor: '#7d7d7d',
      threatOutlineWidth: 2.75,
      threatOutlineOpacity: 0.62,
      threatGlowNeutralColor: '#6c6c6c',
      threatGlowOpacity: 0.48,
    },
    hoverData: null,
    flowData: null,
    threatData: null,
    hoveredCountryCode: null,
  };

  const { applyThreatOutlineState } = await import('../../src/map/layers/effects');
  applyThreatOutlineState(context as never);

  assert.deepEqual(calls, [
    { type: 'layout', id: 'countries-threat-line', key: 'visibility', value: 'none' },
    { type: 'paint', id: 'countries-threat-line', key: 'line-color', value: 'rgba(0,0,0,0)' },
    { type: 'paint', id: 'countries-threat-line', key: 'line-width', value: 2.75 },
    { type: 'paint', id: 'countries-threat-line', key: 'line-opacity', value: 0.62 },
  ]);
});

test('applies base country outline debug state', () => {
  const calls: Array<{ type: string; id: string; key: string; value: unknown }> = [];
  const map = {
    getLayer(id: string) {
      return ['countries-base-fill', 'countries-base-pattern', 'countries-base-line', 'countries-base-glow'].includes(id)
        ? {}
        : undefined;
    },
    setLayoutProperty(id: string, key: string, value: unknown) {
      calls.push({ type: 'layout', id, key, value });
    },
    setPaintProperty(id: string, key: string, value: unknown) {
      calls.push({ type: 'paint', id, key, value });
    },
  };

  applyCountriesBaseState({
    map: map as never,
    activeLayerIds: ['countries-base'],
    debugSettings: {
      ...createDebugSettings(),
      countryDotPatternEnabled: false,
      baseCountryFillColor: '#151515',
      baseCountryFillOpacity: 0.94,
      baseCountryOutlineColor: '#909090',
      baseCountryOutlineWidth: 1.6,
      baseCountryOutlineOpacity: 0.55,
      baseCountryGlowColor: '#a0a0a0',
      baseCountryGlowWidth: 3.4,
      baseCountryGlowOpacity: 0.33,
    },
    hoverData: null,
    flowData: null,
    threatData: null,
    hoveredCountryCode: null,
  } as never);

  assert.deepEqual(calls, [
    { type: 'paint', id: 'countries-base-fill', key: 'fill-color', value: '#151515' },
    { type: 'paint', id: 'countries-base-fill', key: 'fill-opacity', value: 0.94 },
    { type: 'layout', id: 'countries-base-pattern', key: 'visibility', value: 'none' },
    { type: 'paint', id: 'countries-base-pattern', key: 'fill-pattern', value: 'country-dot-pattern-base' },
    { type: 'paint', id: 'countries-base-line', key: 'line-color', value: '#909090' },
    { type: 'paint', id: 'countries-base-line', key: 'line-width', value: 1.6 },
    { type: 'paint', id: 'countries-base-line', key: 'line-opacity', value: 0.55 },
    { type: 'paint', id: 'countries-base-glow', key: 'line-color', value: '#a0a0a0' },
    { type: 'paint', id: 'countries-base-glow', key: 'line-width', value: 3.4 },
    { type: 'paint', id: 'countries-base-glow', key: 'line-opacity', value: 0.33 },
  ]);
});

test('threat neutral stroke and glow stay independent from base boundary colors', () => {
  const threatData = {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
    total: 1,
    countries: [
      {
        country: 'GB',
        incidentCount: 1,
        severityCounts: { low: 1, medium: 0, high: 0 },
        eventLevel: 'low' as const,
      },
    ],
  };

  assert.deepEqual(buildThreatOutlineColorExpression(threatData, false, '#bbbbbb'), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'GB',
    '#bbbbbb',
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, false, '#cccccc'), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'GB',
    '#cccccc',
    'rgba(0,0,0,0)',
  ]);
});

test('registers pattern layers between fill and outline/glow layers', () => {
  const baseOrder: string[] = [];
  const threatOrder: string[] = [];
  const baseMap = {
    getLayer() {
      return undefined;
    },
    addLayer(layer: { id: string }) {
      baseOrder.push(layer.id);
    },
  };
  const threatMap = {
    getLayer() {
      return undefined;
    },
    addLayer(layer: { id: string }) {
      threatOrder.push(layer.id);
    },
  };

  registerCountriesBaseLayers({
    map: baseMap as never,
    activeLayerIds: ['countries-base'],
    debugSettings: createDebugSettings(),
    hoverData: null,
    flowData: null,
    threatData: null,
  });
  registerThreatHighlightLayers({
    map: threatMap as never,
    activeLayerIds: ['threat-highlight'],
    debugSettings: createDebugSettings(),
    hoverData: null,
    flowData: null,
    threatData: null,
  });

  assert.deepEqual(baseOrder, [
    'countries-base-fill',
    'countries-base-pattern',
    'countries-base-line',
    'countries-base-glow',
    'countries-interactive',
  ]);
  assert.deepEqual(threatOrder, [
    'countries-threat-fill',
    'countries-threat-pattern',
    'countries-threat-line',
    'countries-threat-glow',
  ]);
});
