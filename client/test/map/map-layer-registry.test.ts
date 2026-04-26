import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeLayerModules,
  type LayerModule,
} from '../../src/map/layers/registry';

test('initializes supported modules and disables a failed module without aborting registry setup', async () => {
  const calls: string[] = [];
  const modules: LayerModule[] = [
    {
      id: 'ok-a',
      label: 'OK A',
      defaultEnabled: true,
      registerMapSources: async () => {
        calls.push('ok-a:source');
      },
      registerStyleLayers: async () => {
        calls.push('ok-a:layer');
      },
    },
    {
      id: 'bad',
      label: 'Bad',
      defaultEnabled: true,
      registerMapSources: async () => {
        throw new Error('boom');
      },
      registerStyleLayers: async () => {
        calls.push('bad:layer');
      },
    },
    {
      id: 'ok-b',
      label: 'OK B',
      defaultEnabled: true,
      registerMapSources: async () => {
        calls.push('ok-b:source');
      },
      registerStyleLayers: async () => {
        calls.push('ok-b:layer');
      },
    },
  ];

  const result = await initializeLayerModules({
    map: {} as never,
    debugSettings: {
      latestSectionHeight: 160,
      minZoom: -2,
      maxZoom: 6,
      activeCountryCodes: [],
      countryCenterOverrides: {},
      threatColorsEnabled: true,
      threatOutlineVisible: true,
      threatOutlineWidth: 1.8,
      attackArc: {
        bundleCount: 4,
        lengthThresholds: {
          shortMax: 18,
          mediumMax: 55,
        },
        lengthPresets: {
          short: {
            bundleSpreadRatio: 0.05,
            curvatureRatio: 0.08,
            lineWidth: 1.5,
            segmentCount: 64,
          },
          medium: {
            bundleSpreadRatio: 0.08,
            curvatureRatio: 0.16,
            lineWidth: 1.8,
            segmentCount: 100,
          },
          long: {
            bundleSpreadRatio: 0.12,
            curvatureRatio: 0.24,
            lineWidth: 2.2,
            segmentCount: 140,
          },
        },
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
      },
    },
    modules,
    activeLayerIds: ['ok-a', 'bad', 'ok-b'],
    activeThreatCountryCodes: [],
    hoverData: null,
    flowData: null,
    threatData: null,
  });

  assert.deepEqual(result.activeModuleIds, ['ok-a', 'ok-b']);
  assert.deepEqual(result.failedModuleIds, ['bad']);
  assert.equal(result.failures.length, 1);
  assert.deepEqual(calls, ['ok-a:source', 'ok-a:layer', 'ok-b:source', 'ok-b:layer']);
});
