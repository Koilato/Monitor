import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAP_STATE,
  MAX_3D_PITCH,
  MIN_3D_ZOOM,
  normalizeMapState,
  parseMapStateFromSearch,
  serializeMapStateToSearch,
  switchMapStateView,
  timeFilterToDateRange,
  type MapState,
} from '../../src/map/state/map-state';

test('serializes and parses preset URL state', () => {
  const state: MapState = {
    view: '3d',
    camera: {
      lng: 120.125,
      lat: 31.25,
      zoom: 2.4,
      bearing: 12,
      pitch: 48,
    },
    activeLayerIds: ['countries-base', 'threat-highlight', 'threat-labels'],
    timeFilter: {
      mode: 'preset',
      preset: '1d',
      startDate: null,
      endDate: null,
    },
    flowMode: 'allflow',
    flowPlaybackMode: 'time',
  };

  const search = serializeMapStateToSearch(state);
  const parsed = parseMapStateFromSearch(search);

  assert.equal(parsed.view, '3d');
  assert.equal(parsed.camera.lng, 120.125);
  assert.equal(parsed.camera.lat, 31.25);
  assert.equal(parsed.camera.zoom, 2.4);
  assert.deepEqual(parsed.activeLayerIds, ['countries-base', 'threat-highlight', 'threat-labels']);
  assert.deepEqual(parsed.timeFilter, {
    mode: 'preset',
    preset: '1d',
    startDate: null,
    endDate: null,
  });
  assert.equal(parsed.flowMode, 'allflow');
  assert.equal(parsed.flowPlaybackMode, 'time');
});

test('normalizes legacy hour presets to day presets', () => {
  const parsed = parseMapStateFromSearch('?timeMode=preset&timePreset=48h');

  assert.deepEqual(parsed.timeFilter, {
    mode: 'preset',
    preset: '2d',
    startDate: null,
    endDate: null,
  });
});

test('falls back to defaults for invalid URL state', () => {
  const parsed = parseMapStateFromSearch('?view=x&lat=999&lon=nope&zoom=nan&layers=&timeMode=weird');

  assert.deepEqual(parsed, DEFAULT_MAP_STATE);
});

test('serializes flow mode and playback mode in the URL state', () => {
  const search = serializeMapStateToSearch({
    ...DEFAULT_MAP_STATE,
    flowMode: 'allflow',
    flowPlaybackMode: 'country',
  });

  assert.match(search, /flowMode=allflow/);
  assert.match(search, /flowPlaybackMode=country/);
});

test('preserves 2d pitch when normalizing camera updates from map gestures', () => {
  const normalized = normalizeMapState({
    ...DEFAULT_MAP_STATE,
    camera: {
      ...DEFAULT_MAP_STATE.camera,
      pitch: 38,
    },
  });

  assert.equal(normalized.view, '2d');
  assert.equal(normalized.camera.pitch, 38);
});

test('serializes and parses 2d pitch from URL state', () => {
  const search = serializeMapStateToSearch({
    ...DEFAULT_MAP_STATE,
    camera: {
      ...DEFAULT_MAP_STATE.camera,
      pitch: 42,
    },
  });

  const parsed = parseMapStateFromSearch(search);

  assert.equal(parsed.view, '2d');
  assert.equal(parsed.camera.pitch, 42);
});

test('supports fixed custom time filter URLs', () => {
  const parsed = parseMapStateFromSearch('?timeMode=custom&startDate=2026-04-01&endDate=2026-04-22');

  assert.deepEqual(parsed.timeFilter, {
    mode: 'custom',
    preset: null,
    startDate: '2026-04-01',
    endDate: '2026-04-22',
  });
});

test('normalizes legacy layer ids and strips internal layers from URL state', () => {
  const parsed = parseMapStateFromSearch(
    '?layers=countries-base,threat-fill,threat-outline,hover-highlight,attack-arcs,attack-arrowheads',
  );

  assert.deepEqual(parsed.activeLayerIds, [
    'countries-base',
    'threat-highlight',
    'attack-arcs',
  ]);
});

test('serializes legacy layer ids as the new public layer model', () => {
  const search = serializeMapStateToSearch({
    ...DEFAULT_MAP_STATE,
    activeLayerIds: [
      'countries-base',
      'threat-fill',
      'threat-outline',
      'hover-highlight',
      'attack-arcs',
      'attack-arrowheads',
    ],
  });

  assert.match(search, /layers=countries-base%2Cthreat-highlight%2Cattack-arcs/);
});

test('preset time filters resolve as calendar-day UTC windows', () => {
  const range = timeFilterToDateRange({
    mode: 'preset',
    preset: '1d',
    startDate: null,
    endDate: null,
  }, new Date('2026-04-22T00:30:00.000Z'));

  assert.deepEqual(range, {
    startDate: '2026-04-22',
    endDate: '2026-04-22',
  });
});

test('switching 2d to 3d preserves center and normalizes camera', () => {
  const state = switchMapStateView({
    ...DEFAULT_MAP_STATE,
    camera: {
      lng: 110,
      lat: 40,
      zoom: 0.2,
      bearing: 32,
      pitch: 0,
    },
  }, '3d');

  assert.equal(state.view, '3d');
  assert.equal(state.camera.lng, 110);
  assert.equal(state.camera.lat, 40);
  assert.equal(state.camera.bearing, 0);
  assert.equal(state.camera.pitch, MAX_3D_PITCH);
  assert.equal(state.camera.zoom, MIN_3D_ZOOM);
});

test('switching 3d to 2d resets pitch and bearing but keeps valid zoom', () => {
  const state = switchMapStateView({
    ...DEFAULT_MAP_STATE,
    view: '3d',
    camera: {
      lng: 15,
      lat: -22,
      zoom: 3.6,
      bearing: 25,
      pitch: 45,
    },
  }, '2d');

  assert.equal(state.view, '2d');
  assert.equal(state.camera.lng, 15);
  assert.equal(state.camera.lat, -22);
  assert.equal(state.camera.bearing, 0);
  assert.equal(state.camera.pitch, 0);
  assert.equal(state.camera.zoom, 3.6);
});
