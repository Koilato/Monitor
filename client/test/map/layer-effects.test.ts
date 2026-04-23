import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
} from '../../src/map/layers/effects';
import {
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
