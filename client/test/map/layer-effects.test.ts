import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCountriesBaseState,
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
} from '../../src/map/layers/effects';
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
    style: {
      lineColor: '#123456',
      ringColor: '#234567',
      dotColor: '#345678',
    },
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
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

  assert.deepEqual(buildThreatColorExpression(threatData, [], false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    COUNTRY_BASE_FILL_COLOR,
    'CN',
    COUNTRY_BASE_FILL_COLOR,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatOutlineColorExpression(threatData, [], false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_OUTLINE_NEUTRAL_COLOR,
    'CN',
    THREAT_OUTLINE_NEUTRAL_COLOR,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, [], false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_GLOW_NEUTRAL_COLOR,
    'CN',
    THREAT_GLOW_NEUTRAL_COLOR,
    'rgba(0,0,0,0)',
  ]);
});

test('builds outline and glow expressions with active overrides', () => {
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

  assert.deepEqual(buildThreatOutlineColorExpression(threatData, ['CN']), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_VISUAL_LEVEL_TOKENS.medium.stroke,
    'CN',
    THREAT_VISUAL_LEVEL_TOKENS.active.stroke,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, ['CN']), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_VISUAL_LEVEL_TOKENS.medium.glow,
    'CN',
    THREAT_VISUAL_LEVEL_TOKENS.active.glow,
    'rgba(0,0,0,0)',
  ]);
});

test('resolves visual levels using active overrides', () => {
  assert.equal(resolveThreatVisualLevel('low', 'US', []), 'low');
  assert.equal(resolveThreatVisualLevel('medium', 'US', []), 'medium');
  assert.equal(resolveThreatVisualLevel('high', 'CN', ['cn']), 'active');
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
    activeThreatCountryCodes: [],
    debugSettings: {
      latestSectionHeight: 160,
      minZoom: -2,
      maxZoom: 6,
      baseCountryFillColor: '#141414',
      baseCountryFillOpacity: 1,
      baseCountryOutlineColor: '#707070',
      baseCountryOutlineWidth: 0.9,
      baseCountryOutlineOpacity: 1,
      baseCountryGlowColor: '#707070',
      baseCountryGlowWidth: 0,
      baseCountryGlowOpacity: 0,
      activeCountryCodes: [],
      countryCenterOverrides: {},
      threatColorsEnabled: true,
      threatFillOpacity: 1,
      threatOutlineVisible: false,
      threatOutlineNeutralColor: '#7d7d7d',
      threatOutlineWidth: 2.75,
      threatOutlineOpacity: 0.62,
      threatGlowNeutralColor: '#6c6c6c',
      threatGlowWidth: 6.4,
      threatGlowOpacity: 0.48,
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
        presets: {
          short: createPreset(0.05, 0.08, 1.5, 64),
          medium: createPreset(0.08, 0.16, 1.8, 100),
          long: createPreset(0.12, 0.24, 2.2, 140),
        },
      },
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
      return ['countries-base-fill', 'countries-base-line', 'countries-base-glow'].includes(id) ? {} : undefined;
    },
    setPaintProperty(id: string, key: string, value: unknown) {
      calls.push({ type: 'paint', id, key, value });
    },
  };

  applyCountriesBaseState({
    map: map as never,
    activeLayerIds: ['countries-base'],
    activeThreatCountryCodes: [],
    debugSettings: {
      latestSectionHeight: 160,
      minZoom: -2,
      maxZoom: 6,
      baseCountryFillColor: '#151515',
      baseCountryFillOpacity: 0.94,
      baseCountryOutlineColor: '#909090',
      baseCountryOutlineWidth: 1.6,
      baseCountryOutlineOpacity: 0.55,
      baseCountryGlowColor: '#a0a0a0',
      baseCountryGlowWidth: 3.4,
      baseCountryGlowOpacity: 0.33,
      activeCountryCodes: [],
      countryCenterOverrides: {},
      threatColorsEnabled: true,
      threatFillOpacity: 1,
      threatOutlineVisible: false,
      threatOutlineNeutralColor: '#7d7d7d',
      threatOutlineWidth: 2.75,
      threatOutlineOpacity: 1,
      threatGlowNeutralColor: '#6c6c6c',
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
        presets: {
          short: createPreset(0.05, 0.08, 1.5, 64),
          medium: createPreset(0.08, 0.16, 1.8, 100),
          long: createPreset(0.12, 0.24, 2.2, 140),
        },
      },
    },
    hoverData: null,
    flowData: null,
    threatData: null,
    hoveredCountryCode: null,
  } as never);

  assert.deepEqual(calls, [
    { type: 'paint', id: 'countries-base-fill', key: 'fill-color', value: '#151515' },
    { type: 'paint', id: 'countries-base-fill', key: 'fill-opacity', value: 0.94 },
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

  assert.deepEqual(buildThreatOutlineColorExpression(threatData, [], false, '#bbbbbb'), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'GB',
    '#bbbbbb',
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, [], false, '#cccccc'), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'GB',
    '#cccccc',
    'rgba(0,0,0,0)',
  ]);
});
