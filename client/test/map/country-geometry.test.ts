import test from 'node:test';
import assert from 'node:assert/strict';

import * as countryGeometry from '../../src/map/lib/country-geometry';

const GEOJSON_RESPONSE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'ISO3166-1-Alpha-2': 'AA',
        name: 'Archipelago',
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ]],
          [[
            [100, 100],
            [102, 100],
            [102, 102],
            [100, 102],
            [100, 100],
          ]],
        ],
      },
    },
  ],
};

test('getCountryLabelAnchor prefers the largest polygon instead of the global bbox center', async () => {
  assert.equal(typeof countryGeometry.getCountryLabelAnchor, 'function');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.equal(String(input), '/data/countries.geojson');
    return new Response(JSON.stringify(GEOJSON_RESPONSE), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }) as typeof fetch;

  try {
    const anchor = await countryGeometry.getCountryLabelAnchor('AA');
    assert.deepEqual(anchor, {
      lat: 5,
      lon: 5,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
