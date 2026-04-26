import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreatArcPalette } from '../../src/map/layers/overlays';

test('builds arc palette from threat level', () => {
  const palette = buildThreatArcPalette('high');

  assert.deepEqual(palette.source, [255, 150, 110, 143]);
  assert.deepEqual(palette.target, [255, 150, 110, 210]);
  assert.deepEqual(palette.glowTarget, [255, 150, 110, 158]);
  assert.deepEqual(palette.arrow, [255, 150, 110, 189]);
});

test('builds arc palette for active level', () => {
  const palette = buildThreatArcPalette('active');

  assert.deepEqual(palette.target, [220, 120, 255, 235]);
  assert.deepEqual(palette.glowTarget, [220, 120, 255, 176]);
  assert.deepEqual(palette.arrow, [220, 120, 255, 212]);
});
