import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatThreatIntelStatus,
  formatThreatIntelTimestamp,
  toggleThreatIntelSortOrder,
} from '../../src/shell/lib/threat-intel';

test('formatThreatIntelTimestamp normalizes UTC output for the panel', () => {
  assert.equal(formatThreatIntelTimestamp('2026-04-23T09:56:03Z'), '2026-04-23 09:56:03 ');
});

test('toggleThreatIntelSortOrder flips between ascending and descending', () => {
  assert.equal(toggleThreatIntelSortOrder('desc'), 'asc');
  assert.equal(toggleThreatIntelSortOrder('asc'), 'desc');
});

test('formatThreatIntelStatus summarizes the current controls and item count', () => {
  assert.equal(
    formatThreatIntelStatus({
      total: 5,
      sortOrder: 'desc',
      autoScrollEnabled: true,
      refreshEnabled: false,
      loading: false,
    }),
    '倒序 · 自动滚动开 · 定时刷新关 · 5 条',
  );
});
