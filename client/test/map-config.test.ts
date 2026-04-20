import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TWO_D_MAP_CONFIG,
  normalizeTwoDMapConfig,
} from '../src/lib/map-2d-config';
import {
  DEFAULT_THREE_D_MAP_CONFIG,
  normalizeThreeDMapConfig,
} from '../src/lib/map-3d-config';

test('2D config keeps fractional zoom and clamps bounds', () => {
  const config = normalizeTwoDMapConfig({
    zoom: 2.75,
    minZoom: -4,
    maxZoom: 5,
    contentPaddingX: -12,
  });

  assert.equal(config.zoom, 2.75);
  assert.equal(config.minZoom, -2);
  assert.equal(config.maxZoom, 5);
  assert.equal(config.contentPaddingX, 0);
  assert.equal(DEFAULT_TWO_D_MAP_CONFIG.zoom, 0);
});

test('3D config normalizes camera defaults', () => {
  const config = normalizeThreeDMapConfig({
    povLng: 220,
    povLat: -120,
    povAltitude: 0.05,
  });

  assert.equal(config.povLng, 180);
  assert.equal(config.povLat, -90);
  assert.equal(config.povAltitude, 0.2);
  assert.equal(DEFAULT_THREE_D_MAP_CONFIG.povAltitude, 2.45);
});
