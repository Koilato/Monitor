import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYER_MODULES } from '../../src/map/layers/modules';
import { initializeLayerModules } from '../../src/map/layers/registry';

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

test('threat module legend includes active level swatch', () => {
  const threatModule = LAYER_MODULES.find((module) => module.id === 'threat-highlight');
  assert.ok(threatModule?.legend);
  assert.deepEqual(threatModule.legend?.items.map((item) => item.label), [
    '低',
    '中',
    '高',
    '激活',
  ]);
});

test('threat highlight initializes its country source when countries base is disabled', async () => {
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

  const sources = new Set<string>();
  const layers = new Set<string>();
  const map = {
    getSource: (id: string) => (sources.has(id) ? {} : undefined),
    addSource: (id: string) => {
      sources.add(id);
    },
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    addLayer: (layer: { id: string; source?: string }) => {
      if (layer.source && !sources.has(layer.source)) {
        throw new Error(`missing source ${layer.source} for ${layer.id}`);
      }
      layers.add(layer.id);
    },
  };

  try {
    const result = await initializeLayerModules({
      map: map as never,
      deckOverlay: null,
      view: '2d',
      modules: LAYER_MODULES,
      activeLayerIds: ['threat-highlight'],
      activeThreatCountryCodes: [],
      hoverData: null,
      flowData: null,
      threatData: null,
      hoveredCountryCode: null,
    });

    assert.equal(result.failedModuleIds.length, 0);
    assert.ok(result.activeModuleIds.includes('threat-highlight'));
    assert.ok(result.activeModuleIds.includes('hover-highlight'));
  } finally {
    globalThis.fetch = originalFetch;
  }
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
      view: '3d',
      activeLayerIds: ['attack-arcs'],
      activeThreatCountryCodes: [],
      threatData: null,
      hoveredCountryCode: null,
      hoverData: {
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
      flowData: null,
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
