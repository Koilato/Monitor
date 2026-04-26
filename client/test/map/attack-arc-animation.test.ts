import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAttackArcFrameWindow } from '../../src/map/lib/attack-arc-animation';

test('keeps the arc fully intact throughout the hold phase', () => {
  const frame = resolveAttackArcFrameWindow(1800, 1200, 2000, 700);

  assert.deepEqual(frame, {
    phase: 'hold',
    startT: 0,
    endT: 1,
    alpha: 1,
  });
});

test('clips the arc from the source end during fadeout', () => {
  const frame = resolveAttackArcFrameWindow(3400, 1200, 2000, 700);

  assert.equal(frame.phase, 'fade');
  assert.ok(Math.abs(frame.startT - (200 / 700)) < 1e-9);
  assert.equal(frame.endT, 1);
  assert.ok(frame.alpha < 1);
  assert.ok(frame.alpha > 0);
});

test('starts the flight phase from the source and grows the arc toward the target', () => {
  const frame = resolveAttackArcFrameWindow(300, 1200, 2000, 700);

  assert.deepEqual(frame, {
    phase: 'flight',
    startT: 0,
    endT: 0.25,
    alpha: 1,
  });
});
