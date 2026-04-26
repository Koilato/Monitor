import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCanvasArcData, buildTwoDArcData } from '../../src/map/lib/arc-data';

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

function installGeojsonFetchMock() {
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

  return originalFetch;
}

test('builds bundled 2d arc data from hover response country centroids', async () => {
  const originalFetch = installGeojsonFetchMock();

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
    }, null, []);

    assert.equal(data.length, 4);
    assert.deepEqual(data.map((datum) => datum.id), [
      'US-CN-0',
      'US-CN-1',
      'US-CN-2',
      'US-CN-3',
    ]);
    assert.deepEqual(data.map((datum) => datum.bundleIndex), [0, 1, 2, 3]);
    assert.deepEqual(data.map((datum) => datum.bundleCount), [4, 4, 4, 4]);
    assert.deepEqual(data.map((datum) => datum.bundleOffset), [-1.5, -0.5, 0.5, 1.5]);
    assert.deepEqual(data.map((datum) => datum.source), [
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 5],
    ]);
    assert.deepEqual(data.map((datum) => datum.target), [
      [35, 35],
      [35, 35],
      [35, 35],
      [35, 35],
    ]);
    assert.deepEqual(data.map((datum) => datum.label), [
      'US → CN',
      'US → CN',
      'US → CN',
      'US → CN',
    ]);
    assert.notDeepEqual(data[0]?.arrowPosition, data[3]?.arrowPosition);
    assert.equal(data[0]?.visualLevel, 'low');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses custom bundle settings when building arc data', async () => {
  const originalFetch = installGeojsonFetchMock();

  try {
    const data = await buildTwoDArcData({
      victimCountry: 'CN',
      startDate: '2026-04-01',
      endDate: '2026-04-22',
      total: 1,
      incidents: [],
      flows: [
        {
          attackerCountry: 'US',
          victimCountry: 'CN',
          count: 1,
          uuids: ['a'],
        },
      ],
    }, null, [], {
      bundleCount: 2,
      bundleSpreadRatio: 0.2,
    });

    assert.equal(data.length, 2);
    assert.deepEqual(data.map((datum) => datum.bundleIndex), [0, 1]);
    assert.deepEqual(data.map((datum) => datum.bundleCount), [2, 2]);
    assert.deepEqual(data.map((datum) => datum.bundleOffset), [-0.5, 0.5]);
    assert.notDeepEqual(data[0]?.arrowPosition, data[1]?.arrowPosition);
    assert.notEqual(data[0]?.angle, data[1]?.angle);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('builds bundled canvas arc data with replay metadata', async () => {
  const originalFetch = installGeojsonFetchMock();

  try {
    const data = await buildCanvasArcData({
      flows: [
        {
          attackerCountry: 'US',
          victimCountry: 'CN',
          count: 2,
          uuids: ['a', 'b'],
          firstDate: '2026-04-01',
          lastDate: '2026-04-02',
        },
      ],
    }, null, []);

    assert.equal(data.length, 4);
    assert.deepEqual(data.map((datum) => datum.bundleIndex), [0, 1, 2, 3]);
    assert.deepEqual(data.map((datum) => datum.bundleCount), [4, 4, 4, 4]);
    assert.deepEqual(data.map((datum) => datum.bundleOffset), [-1.5, -0.5, 0.5, 1.5]);
    assert.deepEqual(data.map((datum) => datum.firstDate), [
      '2026-04-01',
      '2026-04-01',
      '2026-04-01',
      '2026-04-01',
    ]);
    assert.deepEqual(data.map((datum) => datum.lastDate), [
      '2026-04-02',
      '2026-04-02',
      '2026-04-02',
      '2026-04-02',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
