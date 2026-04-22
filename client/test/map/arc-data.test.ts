import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTwoDArcData } from '../../src/map/lib/arc-data';

const GEOJSON_RESPONSE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'ISO3166-1-Alpha-2': 'US',
        name: 'United States',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        'ISO3166-1-Alpha-2': 'CN',
        name: 'China',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [30, 30],
          [40, 30],
          [40, 40],
          [30, 40],
          [30, 30],
        ]],
      },
    },
  ],
};

test('builds 2d arc data from hover response country centroids', async () => {
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
    const data = await buildTwoDArcData({
      victimCountry: 'CN',
      startDate: '2026-04-01',
      endDate: '2026-04-22',
      total: 2,
      incidents: [],
      flows: [
        {
          attackerCountry: 'US',
          victimCountry: 'CN',
          count: 2,
          uuids: ['a', 'b'],
        },
      ],
    });

    assert.deepEqual(data, [
      {
        id: 'US-CN',
        source: [5, 5],
        target: [35, 35],
        arrowPosition: [34.25, 34.25],
        label: 'US → CN',
        count: 2,
        angle: 45,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
