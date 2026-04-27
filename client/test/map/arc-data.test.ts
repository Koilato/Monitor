import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCanvasArcData, buildTwoDArcData } from '../../src/map/lib/arc-data';
import type { AttackArcDebugSettings } from '../../src/map/state/map-types';

function createPreset(
  bundleSpreadRatio: number,
  curvatureRatio: number,
  lineWidth: number,
  segmentCount: number,
  bundleCount = 4,
) {
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
    bundleCount,
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
    style: {
      lineColor: '#123456',
      ringColor: '#234567',
      dotColor: '#345678',
    },
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

const ARC_SETTINGS: AttackArcDebugSettings = {
  lengthThresholds: {
    shortMax: 18,
    mediumMax: 55,
  },
  presets: {
    short: createPreset(0.05, 0.08, 1.5, 64),
    medium: createPreset(0.08, 0.16, 1.8, 100),
    long: createPreset(0.12, 0.24, 2.2, 140),
  },
};

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

test('builds bundled 2d arc data from the static country center dictionary', async () => {
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
  }, null, [], ARC_SETTINGS);

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
    [-97.506445, 38.92198],
    [-97.506445, 38.92198],
    [-97.506445, 38.92198],
    [-97.506445, 38.92198],
  ]);
  assert.deepEqual(data.map((datum) => datum.target), [
    [109.505273, 32.434741],
    [109.505273, 32.434741],
    [109.505273, 32.434741],
    [109.505273, 32.434741],
  ]);
  assert.equal(data[0]?.lengthPreset, 'long');
  assert.equal(data[0]?.bundleSpreadRatio, 0.12);
  assert.equal(data[0]?.curvatureRatio, 0.24);
  assert.equal(data[0]?.lineWidth, 2.2);
  assert.equal(data[0]?.segmentCount, 140);
  assert.notDeepEqual(data[0]?.arrowPosition, data[3]?.arrowPosition);
  assert.deepEqual(new Set(data.map((datum) => datum.source.map((value) => value.toFixed(6)).join(','))).size, 1);
  assert.deepEqual(new Set(data.map((datum) => datum.target.map((value) => value.toFixed(6)).join(','))).size, 1);
});

test('applies short, medium, and long presets from euclidean distance thresholds', async () => {
  const data = await buildCanvasArcData({
    flows: [
      {
        attackerCountry: 'DE',
        victimCountry: 'FR',
        count: 1,
        uuids: ['a'],
      },
      {
        attackerCountry: 'TR',
        victimCountry: 'DE',
        count: 1,
        uuids: ['b'],
      },
      {
        attackerCountry: 'US',
        victimCountry: 'CN',
        count: 1,
        uuids: ['c'],
      },
    ],
  }, null, [], ARC_SETTINGS);

  assert.equal(data.length, 12);

  const shortFlow = data.find((datum) => datum.flowKey === 'DE->FR');
  const mediumFlow = data.find((datum) => datum.flowKey === 'TR->DE');
  const longFlow = data.find((datum) => datum.flowKey === 'US->CN');

  assert.equal(shortFlow?.lengthPreset, 'short');
  assert.equal(shortFlow?.bundleSpreadRatio, 0.05);
  assert.equal(shortFlow?.curvatureRatio, 0.08);
  assert.equal(shortFlow?.lineWidth, 1.5);
  assert.equal(shortFlow?.segmentCount, 64);

  assert.equal(mediumFlow?.lengthPreset, 'medium');
  assert.equal(mediumFlow?.bundleSpreadRatio, 0.08);
  assert.equal(mediumFlow?.curvatureRatio, 0.16);
  assert.equal(mediumFlow?.lineWidth, 1.8);
  assert.equal(mediumFlow?.segmentCount, 100);

  assert.equal(longFlow?.lengthPreset, 'long');
  assert.equal(longFlow?.bundleSpreadRatio, 0.12);
  assert.equal(longFlow?.curvatureRatio, 0.24);
  assert.equal(longFlow?.lineWidth, 2.2);
  assert.equal(longFlow?.segmentCount, 140);
});

test('supports single-line and wider bundle counts with the new settings shape', async () => {
  const singleLine = await buildCanvasArcData({
    flows: [
      {
        attackerCountry: 'US',
        victimCountry: 'CN',
        count: 1,
        uuids: ['a'],
      },
    ],
  }, null, [], {
    ...ARC_SETTINGS,
    presets: {
      ...ARC_SETTINGS.presets,
      long: createPreset(0.12, 0.24, 2.2, 140, 1),
    },
  });

  assert.equal(singleLine.length, 1);
  assert.deepEqual(singleLine.map((datum) => datum.bundleOffset), [0]);

  const sixLine = await buildTwoDArcData({
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
    ...ARC_SETTINGS,
    presets: {
      ...ARC_SETTINGS.presets,
      long: createPreset(0.12, 0.24, 2.2, 140, 6),
    },
  });

  assert.equal(sixLine.length, 6);
  assert.deepEqual(sixLine.map((datum) => datum.bundleOffset), [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]);
  assert.deepEqual(new Set(sixLine.map((datum) => datum.target.map((value) => value.toFixed(6)).join(','))).size, 1);
});

test('returns no arcs when a country center cannot be resolved', async () => {
  const originalFetch = installGeojsonFetchMock();

  try {
    const missingSource = await buildCanvasArcData({
      flows: [
        {
          attackerCountry: 'ZZ',
          victimCountry: 'CN',
          count: 1,
          uuids: ['a'],
        },
      ],
    }, null, [], ARC_SETTINGS);

    assert.deepEqual(missingSource, []);

    const missingTarget = await buildTwoDArcData({
      victimCountry: 'CN',
      startDate: '2026-04-01',
      endDate: '2026-04-22',
      total: 1,
      incidents: [],
      flows: [
        {
          attackerCountry: 'US',
          victimCountry: 'ZZ',
          count: 1,
          uuids: ['a'],
        },
      ],
    }, null, [], ARC_SETTINGS);

    assert.deepEqual(missingTarget, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
