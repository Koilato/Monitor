import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeDateRange } from '../../src/map/hooks/useMapDataSync';

test('serializes equal date ranges to the same cache key', () => {
  const first = serializeDateRange({
    startDate: '2026-04-01',
    endDate: '2026-04-22',
  });
  const second = serializeDateRange({
    startDate: '2026-04-01',
    endDate: '2026-04-22',
  });

  assert.equal(first, '2026-04-01__2026-04-22');
  assert.equal(second, first);
});

test('serializes open-ended ranges deterministically', () => {
  assert.equal(
    serializeDateRange({
      startDate: null,
      endDate: '2026-04-22',
    }),
    '__2026-04-22',
  );
});
