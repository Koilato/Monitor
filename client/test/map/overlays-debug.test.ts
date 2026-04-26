import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAttackArcLayers, buildAttackArrowheadLayers } from '../../src/map/layers/overlays';

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

test('3d attack arc layers honor debug scaling settings', async () => {
  const originalFetch = installGeojsonFetchMock();

  try {
    const context = {
      view: '3d' as const,
      flowData: {
        flows: [
          {
            attackerCountry: 'US',
            victimCountry: 'CN',
            count: 3,
            uuids: ['a', 'b', 'c'],
          },
        ],
      },
      hoverData: null,
      threatData: null,
      activeThreatCountryCodes: [],
      debugSettings: {
        latestSectionHeight: 160,
        minZoom: -2,
        maxZoom: 6,
        activeCountryCodes: [],
        threatColorsEnabled: true,
        threatOutlineVisible: true,
        threatOutlineWidth: 1.7,
        attackArc: {
          bundleCount: 2,
          bundleSpreadRatio: 0.2,
          curvatureRatio: 0.16,
          lineWidth: 1.8,
          segmentCount: 100,
          flightDuration: 1300,
          holdDuration: 2000,
          fadeoutDuration: 700,
          replayDelayMs: 5000,
          bundleIntervalMs: 220,
          maxConcurrentStarts: 4,
          ringRadius: 15,
          ringCount: 2,
          ringSpacing: 5,
          ringLineWidth: 2.5,
          ringDotRadius: 6,
          arcWidthScale3d: 1.5,
          arrowSizeScale3d: 0.5,
        },
      },
    } as const;

    const arcLayers = await buildAttackArcLayers(context as never);
    const arrowLayers = await buildAttackArrowheadLayers(context as never);

    assert.equal(arcLayers.length, 2);
    assert.equal(arrowLayers.length, 1);

    const arcLayer = arcLayers[1] as { props: { data: unknown[]; getWidth: (datum: unknown) => number } };
    const arrowLayer = arrowLayers[0] as { props: { data: unknown[]; getSize: (datum: unknown) => number } };
    const arcDatum = arcLayer.props.data[0];
    const arrowDatum = arrowLayer.props.data[0];

    assert.ok(Math.abs(arcLayer.props.getWidth(arcDatum) - 4.725) < 1e-9);
    assert.ok(Math.abs(arrowLayer.props.getSize(arrowDatum) - 6.325) < 1e-9);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
