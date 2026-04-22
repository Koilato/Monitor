import test from 'node:test';
import assert from 'node:assert/strict';

const COUNTRY_GEOJSON_RESPONSE = {
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
          [20, 20],
          [30, 20],
          [30, 30],
          [20, 30],
          [20, 20],
        ]],
      },
    },
  ],
};

test('buildThreatLabelFeatures returns only threatened countries with Chinese names ordered by priority', async () => {
  const threatLabels = await import('../../src/map/layers/threat-labels').catch(() => null);
  assert.notEqual(threatLabels, null);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.equal(String(input), '/data/countries.geojson');
    return new Response(JSON.stringify(COUNTRY_GEOJSON_RESPONSE), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }) as typeof fetch;

  try {
    const features = await threatLabels.buildThreatLabelFeatures({
      startDate: '2026-04-01',
      endDate: '2026-04-22',
      total: 3,
      countries: [
        {
          country: 'US',
          incidentCount: 1,
          severityCounts: { low: 1, medium: 0, high: 0 },
          threatScore: 1,
          threatLevel: 'low',
        },
        {
          country: 'CN',
          incidentCount: 2,
          severityCounts: { low: 0, medium: 1, high: 1 },
          threatScore: 5,
          threatLevel: 'high',
        },
      ],
    });

    assert.equal(features.type, 'FeatureCollection');
    assert.equal(features.features.length, 2);
    assert.deepEqual(features.features.map((feature) => feature.properties?.label), ['中国', '美国']);
    assert.deepEqual(features.features.map((feature) => feature.properties?.['ISO3166-1-Alpha-2']), ['CN', 'US']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveThreatLabelName falls back to the English country name when no Chinese mapping exists', async () => {
  const threatLabels = await import('../../src/map/layers/threat-labels').catch(() => null);
  assert.notEqual(threatLabels, null);
  assert.equal(threatLabels.resolveThreatLabelName('ZZ', 'Fallback Name'), 'Fallback Name');
});
