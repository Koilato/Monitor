import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYER_MODULES } from '../../src/map/layers/modules';
import { initializeLayerModules } from '../../src/map/layers/registry';

function createPreset(bundleSpreadRatio: number, curvatureRatio: number, lineWidth: number, segmentCount: number) {
  const stage = {
    lineAlpha: 1,
    ringAlpha: 1,
    dotAlpha: 1,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
  };

  return {
    bundleCount: 4,
    flightDuration: 1300,
    holdDuration: 2000,
    fadeoutDuration: 700,
    replayDelayMs: 5000,
    bundleIntervalMs: 220,
    maxConcurrentStarts: 4,
    bundleSpreadRatio,
    curvatureRatio,
    lineWidth,
    segmentCount,
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

function createVisualStyles() {
  return {
    low: { lineColor: '#14b8a6', ringColor: '#14b8a6', dotColor: '#14b8a6' },
    medium: { lineColor: '#ffb72e', ringColor: '#ffb72e', dotColor: '#ffb72e' },
    high: { lineColor: '#ff1d24', ringColor: '#ff1d24', dotColor: '#ff1d24' },
  };
}

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

test('threat module legend includes critical level swatch', () => {
  const threatModule = LAYER_MODULES.find((module) => module.id === 'threat-highlight');
  assert.ok(threatModule?.legend);
  assert.deepEqual(threatModule.legend?.items.map((item) => item.label), [
    '低',
    '中',
    '高',
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
      debugSettings: {
        latestSectionHeight: 160,
        minZoom: -2,
        maxZoom: 6,
        countryDotPatternEnabled: true,
        countryDotPatternColor: '#7a7a7a',
        countryDotPatternDensity: 16,
        countryDotPatternOpacity: 0.36,
        baseCountryFillColor: '#141414',
        baseCountryFillOpacity: 1,
        baseCountryOutlineColor: '#707070',
        baseCountryOutlineWidth: 0.9,
        baseCountryOutlineOpacity: 1,
        baseCountryGlowColor: '#707070',
        baseCountryGlowWidth: 0,
        baseCountryGlowOpacity: 0,
        countryCenterOverrides: {},
        threatColorsEnabled: true,
        threatFillOpacity: 1,
        threatOutlineVisible: true,
        threatOutlineNeutralColor: '#707070',
        threatOutlineWidth: 1.8,
        threatOutlineOpacity: 1,
        threatGlowNeutralColor: '#707070',
        threatGlowWidth: 6.4,
        threatGlowOpacity: 1,
        hoverFillColor: '#34c8ff',
        hoverFillOpacity: 0.18,
        hoverThreatFillOpacity: 1,
        hoverGlowColor: '#34c8ff',
        hoverGlowWidth: 5.5,
        hoverGlowOpacity: 0.28,
        hoverThreatGlowOpacity: 1,
        hoverBorderColor: '#52d6ff',
        hoverBorderWidth: 2.2,
        hoverBorderOpacity: 0.9,
        hoverThreatBorderOpacity: 1,
        attackArc: {
          lengthThresholds: {
            shortMax: 18,
            mediumMax: 55,
          },
          visualStyles: createVisualStyles(),
          presets: {
            short: createPreset(0.05, 0.08, 1.5, 64),
            medium: createPreset(0.08, 0.16, 1.8, 100),
            long: createPreset(0.12, 0.24, 2.2, 140),
          },
        },
      },
      modules: LAYER_MODULES,
      activeLayerIds: ['threat-highlight'],
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
