import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTrafficStats, summarizeThreatFrequency } from '../../src/shell/lib/traffic-stats';

test('buildTrafficStats aggregates repeated attacker countries and sorts by total volume', () => {
  const result = buildTrafficStats({
    startDate: '2026-04-01',
    endDate: '2026-04-07',
    total: 7,
    flows: [
      { attackerCountry: 'RU', victimCountry: 'CN', count: 12, uuids: [] },
      { attackerCountry: 'US', victimCountry: 'JP', count: 8, uuids: [] },
      { attackerCountry: 'RU', victimCountry: 'DE', count: 5, uuids: [] },
      { attackerCountry: 'KR', victimCountry: 'SG', count: 10, uuids: [] },
      { attackerCountry: 'US', victimCountry: 'FR', count: 6, uuids: [] },
    ],
  });

  assert.equal(result.totalVolume, 41);
  assert.deepEqual(
    result.bars.map((item) => [item.countryCode, item.volume, item.rank, item.tone]),
    [
      ['RU', 17, 1, 'critical'],
      ['US', 14, 2, 'warning'],
      ['KR', 10, 3, 'info'],
    ],
  );
  assert.equal(result.origins[0]?.share, 17 / 41);
  assert.equal(result.origins[1]?.share, 14 / 41);
});

test('buildTrafficStats respects top limits and keeps remaining entries neutral', () => {
  const flows = ['CN', 'RU', 'US', 'KR', 'DE', 'JP', 'FR', 'IN', 'BR', 'GB', 'SG', 'CA']
    .map((attackerCountry, index) => ({
      attackerCountry,
      victimCountry: 'CN',
      count: 50 - index,
      uuids: [],
    }));

  const result = buildTrafficStats({
    startDate: '2026-04-01',
    endDate: '2026-04-07',
    total: flows.length,
    flows,
  });

  assert.equal(result.bars.length, 10);
  assert.equal(result.origins.length, 3);
  assert.equal(result.bars[3]?.tone, 'neutral');
  assert.equal(result.bars[9]?.countryCode, 'GB');
});

test('buildTrafficStats handles empty flow data without NaN percentages', () => {
  const result = buildTrafficStats({
    startDate: '2026-04-01',
    endDate: '2026-04-07',
    total: 0,
    flows: [],
  });

  assert.equal(result.totalVolume, 0);
  assert.deepEqual(result.bars, []);
  assert.deepEqual(result.origins, []);
});

test('summarizeThreatFrequency totals high, medium, and low counts across the trend window', () => {
  const result = summarizeThreatFrequency([
    { date: '04-21', high: 16, medium: 10, low: 7 },
    { date: '04-22', high: 13, medium: 12, low: 11 },
    { date: '04-23', high: 18, medium: 14, low: 9 },
  ]);

  assert.deepEqual(result, {
    high: 47,
    medium: 36,
    low: 27,
  });
});
