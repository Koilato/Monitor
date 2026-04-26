import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
} from '../../src/map/layers/effects';
import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_GLOW_COLOR,
  COUNTRY_BASE_LINE_COLOR,
  THREAT_VISUAL_LEVEL_TOKENS,
  resolveThreatVisualLevel,
} from '../../src/map/layers/tokens';

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
    COUNTRY_BASE_LINE_COLOR,
    'CN',
    COUNTRY_BASE_LINE_COLOR,
    'rgba(0,0,0,0)',
  ]);

  assert.deepEqual(buildThreatGlowColorExpression(threatData, [], false), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    COUNTRY_BASE_GLOW_COLOR,
    'CN',
    COUNTRY_BASE_GLOW_COLOR,
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
    deckOverlay: null,
    view: '2d' as const,
    activeLayerIds: ['threat-highlight'],
    activeThreatCountryCodes: [],
    debugSettings: {
      latestSectionHeight: 160,
      minZoom: -2,
      maxZoom: 6,
      activeCountryCodes: [],
      threatColorsEnabled: true,
      threatOutlineVisible: false,
      threatOutlineWidth: 2.75,
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
  ]);
});
