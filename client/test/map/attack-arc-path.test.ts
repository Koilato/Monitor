import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveArcPath,
  slicePathByLength,
} from '../../src/map/lib/attack-arc-path';

const baseSettings = {
  curveType: 'cubic' as const,
  pathSamplingCount: 80,
  minArcHeightPx: 30,
  maxArcHeightPx: 90,
  arcHeightRatio: 0.4,
  controlInsetRatio: 0.34,
  curvatureRatio: 0.16,
  bundleSpreadRatio: 0.08,
  bundleMode: 'pulse-same-path' as const,
  bundleHeightStepPx: 3,
};

test('resolveArcPath samples a cubic path with increasing lengths', () => {
  const path = resolveArcPath({ x: 0, y: 100 }, { x: 200, y: 100 }, 0, baseSettings);

  assert.equal(path.points.length, 81);
  assert.equal(path.lengths[0], 0);
  assert.ok(path.totalLength > 200);

  for (let index = 1; index < path.lengths.length; index += 1) {
    assert.ok((path.lengths[index] ?? 0) >= (path.lengths[index - 1] ?? 0));
  }
});

test('slicePathByLength returns an approximately half-length slice', () => {
  const path = resolveArcPath({ x: 0, y: 100 }, { x: 200, y: 100 }, 0, baseSettings);
  const sliced = slicePathByLength(path, 0, 0.5);
  let slicedLength = 0;

  for (let index = 1; index < sliced.length; index += 1) {
    const previous = sliced[index - 1];
    const point = sliced[index];
    if (!previous || !point) {
      continue;
    }
    slicedLength += Math.hypot(point.x - previous.x, point.y - previous.y);
  }

  assert.ok(Math.abs(slicedLength - (path.totalLength / 2)) < 2);
});

test('resolveArcPath clamps screen arc height between min and max', () => {
  const shortPath = resolveArcPath({ x: 0, y: 100 }, { x: 20, y: 100 }, 0, {
    ...baseSettings,
    curveType: 'quadratic',
    minArcHeightPx: 40,
    maxArcHeightPx: 80,
    arcHeightRatio: 0.1,
  });
  const longPath = resolveArcPath({ x: 0, y: 100 }, { x: 500, y: 100 }, 0, {
    ...baseSettings,
    curveType: 'quadratic',
    minArcHeightPx: 40,
    maxArcHeightPx: 80,
    arcHeightRatio: 0.8,
  });

  const shortApexY = Math.min(...shortPath.points.map((point) => point.y));
  const longApexY = Math.min(...longPath.points.map((point) => point.y));

  assert.ok(shortApexY < 100 - 18);
  assert.ok(shortApexY >= 100 - 25);
  assert.ok(longApexY < 100 - 38);
  assert.ok(longApexY >= 100 - 45);
});
