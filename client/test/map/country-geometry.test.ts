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
            [10, 2],
            [2, 2],
            [2, 8],
            [10, 8],
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

function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) {
      continue;
    }

    const [xi, yi] = current;
    const [xj, yj] = previous;

    const intersects = ((yi > lat) !== (yj > lat))
      && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point: { lon: number; lat: number }, polygon: [number, number][][]): boolean {
  const outerRing = polygon[0];
  if (!outerRing || !pointInRing(point.lon, point.lat, outerRing)) {
    return false;
  }

  for (let index = 1; index < polygon.length; index += 1) {
    const hole = polygon[index];
    if (hole && pointInRing(point.lon, point.lat, hole)) {
      return false;
    }
  }

  return true;
}

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
    const centroid = await countryGeometry.getCountryCentroid('AA');
    const anchor = await countryGeometry.getCountryLabelAnchor('AA');

    assert.deepEqual(anchor, centroid);
    assert.ok(anchor);
    assert.ok(pointInPolygon(anchor, GEOJSON_RESPONSE.features[0].geometry.coordinates[0]));
    assert.notDeepEqual(anchor, {
      lat: 51,
      lon: 51,
    });
  } finally {
    countryGeometry.setCountryCenterOverrides({});
    globalThis.fetch = originalFetch;
  }
});

test('country center overrides take precedence over the static dictionary', async () => {
  countryGeometry.setCountryCenterOverrides({
    US: { lon: 1.5, lat: 2.5 },
  });

  try {
    assert.deepEqual(await countryGeometry.getCountryCentroid('US'), { lon: 1.5, lat: 2.5 });
    assert.equal(countryGeometry.getCountryCenterSource('US'), 'override');
  } finally {
    countryGeometry.setCountryCenterOverrides({});
  }
});
