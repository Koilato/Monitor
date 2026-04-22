import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampSize,
  resolveDraggedSplitSize,
} from '../../src/shell/lib/split-size';

test('clampSize limits values to the provided bounds', () => {
  assert.equal(clampSize(40, 80, 200), 80);
  assert.equal(clampSize(260, 80, 200), 200);
  assert.equal(clampSize(140, 80, 200), 140);
});

test('resolveDraggedSplitSize applies delta and clamps to bounds', () => {
  assert.equal(
    resolveDraggedSplitSize({
      startSize: 220,
      delta: 90,
      minSize: 160,
      maxSize: 280,
    }),
    280,
  );

  assert.equal(
    resolveDraggedSplitSize({
      startSize: 220,
      delta: -120,
      minSize: 160,
      maxSize: 280,
    }),
    160,
  );
});
