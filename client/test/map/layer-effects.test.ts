import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreatColorExpression } from '../../src/map/layers/effects';
import { THREAT_LEVEL_COLORS } from '../../src/map/layers/tokens';

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
        threatScore: 5,
        threatLevel: 'medium',
      },
      {
        country: 'CN',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 0, high: 1 },
        threatScore: 3,
        threatLevel: 'high',
      },
      {
        country: 'RU',
        incidentCount: 1,
        severityCounts: { low: 0, medium: 0, high: 1 },
        threatScore: 12,
        threatLevel: 'critical',
      },
    ],
  }), [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
    'US',
    THREAT_LEVEL_COLORS.medium,
    'CN',
    THREAT_LEVEL_COLORS.high,
    'RU',
    THREAT_LEVEL_COLORS.critical,
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

test('uses the warm threat palette with a deep red critical color', () => {
  assert.equal(THREAT_LEVEL_COLORS.low, 'rgba(250,204,21,0.68)');
  assert.equal(THREAT_LEVEL_COLORS.medium, 'rgba(249,115,22,0.74)');
  assert.equal(THREAT_LEVEL_COLORS.high, 'rgba(239,68,68,0.78)');
  assert.equal(THREAT_LEVEL_COLORS.critical, 'rgba(185,28,28,0.82)');
});
