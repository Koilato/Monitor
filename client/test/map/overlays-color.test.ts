import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThreatArcPalette } from '../../src/map/layers/overlays';

test('builds arc palette from threat level', () => {
  const palette = buildThreatArcPalette('high', []);

  assert.deepEqual(palette.target, [255, 95, 116, 230]);
  assert.deepEqual(palette.glowTarget, [255, 95, 116, 173]);
  assert.deepEqual(palette.arrow, [255, 95, 116, 207]);
});

test('builds arc palette with active override', () => {
  const palette = buildThreatArcPalette('high', ['CN'], 'CN');

  assert.deepEqual(palette.target, [220, 120, 255, 235]);
  assert.deepEqual(palette.glowTarget, [220, 120, 255, 176]);
  assert.deepEqual(palette.arrow, [220, 120, 255, 212]);
});
