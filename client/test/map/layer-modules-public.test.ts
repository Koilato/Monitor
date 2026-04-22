import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYER_MODULES } from '../../src/map/layers/modules';

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

test('exposes only the public map layers in the expected order', () => {
  const publicLayerIds = LAYER_MODULES
    .filter((module) => module.showInLayerControls !== false)
    .map((module) => module.id);

  assert.deepEqual(publicLayerIds, [
    'countries-base',
    'threat-highlight',
    'threat-labels',
    'attack-arcs',
  ]);
});

test('attack-arcs builds arc and arrowhead overlays together', async () => {
  const attackArcsModule = LAYER_MODULES.find((module) => module.id === 'attack-arcs');
  assert.ok(attackArcsModule?.buildOverlayLayers);

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
    const layers = await attackArcsModule.buildOverlayLayers({
      map: {} as never,
      deckOverlay: null,
      view: '2d',
      activeLayerIds: ['attack-arcs'],
      threatData: null,
      hoveredCountryCode: null,
      data: {
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
      },
    });

    assert.deepEqual(layers.map((layer) => layer.id), [
      'attack-arcs-glow',
      'attack-arcs',
      'attack-arrowheads',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
