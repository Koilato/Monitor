import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequestTracker } from '../../src/map/lib/request-tracker';

test('createRequestTracker aborts the previous request and keeps only the latest ticket current', () => {
  const tracker = createRequestTracker();

  const first = tracker.next();
  assert.equal(first.id, 1);
  assert.equal(first.signal.aborted, false);
  assert.equal(tracker.isCurrent(first.id), true);

  const second = tracker.next();
  assert.equal(first.signal.aborted, true);
  assert.equal(second.id, 2);
  assert.equal(second.signal.aborted, false);
  assert.equal(tracker.isCurrent(first.id), false);
  assert.equal(tracker.isCurrent(second.id), true);

  tracker.abort();
  assert.equal(second.signal.aborted, true);
  assert.equal(tracker.isCurrent(second.id), false);
});
