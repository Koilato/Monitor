import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMap2DCamera,
  normalizeMap3DCamera,
  parseMapUrlState,
  serializeMapUrlState,
} from '../src/lib/map-state';

test('parseMapUrlState reads preset time filter and normalizes 2D camera values', () => {
  const state = parseMapUrlState(
    'viewMode=2d&time=preset&preset=30d&centerLng=181&centerLat=-95&zoom=4.5',
  );

  assert.deepEqual(state, {
    viewMode: '2d',
    timeFilter: {
      kind: 'preset',
      preset: '30d',
    },
    camera: {
      kind: '2d',
      centerLng: 180,
      centerLat: -90,
      zoom: 4.5,
    },
  });
});

test('serializeMapUrlState writes custom time filter and 3D camera values', () => {
  const urlSearchParams = serializeMapUrlState({
    viewMode: '3d',
    timeFilter: {
      kind: 'custom',
      startDate: '2026-04-01',
      endDate: '2026-04-22',
    },
    camera: {
      kind: '3d',
      povLng: -181,
      povLat: 95,
      povAltitude: 0.1,
    },
  });

  assert.equal(
    urlSearchParams.toString(),
    'viewMode=3d&time=custom&startDate=2026-04-01&endDate=2026-04-22&povLng=-180&povLat=90&povAltitude=0.2',
  );
});

test('camera normalization helpers clamp values to supported bounds', () => {
  assert.deepEqual(normalizeMap2DCamera({
    centerLng: 200,
    centerLat: -120,
    zoom: 9,
  }), {
    kind: '2d',
    centerLng: 180,
    centerLat: -90,
    zoom: 6,
  });

  assert.deepEqual(normalizeMap3DCamera({
    povLng: -181,
    povLat: 95,
    povAltitude: 0,
  }), {
    kind: '3d',
    povLng: -180,
    povLat: 90,
    povAltitude: 0.2,
  });
});
