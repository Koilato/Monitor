import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInternalCountryBordersGeoJson,
} from '../../src/map/layers/maplibre';

function normalizeLine(coordinates: number[][]): string {
  const [start, end] = coordinates;
  const startKey = `${start[0]},${start[1]}`;
  const endKey = `${end[0]},${end[1]}`;
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

test('buildInternalCountryBordersGeoJson keeps only shared country borders', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { 'ISO3166-1-Alpha-2': 'AA' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ]],
        },
      },
      {
        type: 'Feature',
        properties: { 'ISO3166-1-Alpha-2': 'BB' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [1, 0],
            [2, 0],
            [2, 1],
            [1, 1],
            [1, 0],
          ]],
        },
      },
      {
        type: 'Feature',
        properties: { 'ISO3166-1-Alpha-2': 'CC' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 11],
            [10, 10],
          ]],
        },
      },
    ],
  } as const;

  const result = buildInternalCountryBordersGeoJson(geojson as never);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0]?.geometry.type, 'LineString');
  assert.equal(
    normalizeLine(result.features[0]?.geometry.coordinates as number[][]),
    '1,0|1,1',
  );
});

test('buildInternalCountryBordersGeoJson returns empty output for isolated countries', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { 'ISO3166-1-Alpha-2': 'AA' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ]],
        },
      },
    ],
  } as const;

  const result = buildInternalCountryBordersGeoJson(geojson as never);
  assert.deepEqual(result.features, []);
});
