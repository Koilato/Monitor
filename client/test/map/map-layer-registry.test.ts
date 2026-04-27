import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeLayerModules,
  type LayerModule,
} from '../../src/map/layers/registry';

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
      baseCountryFillColor: '#141414',
      baseCountryFillOpacity: 1,
      baseCountryOutlineColor: '#707070',
      baseCountryOutlineWidth: 0.9,
      baseCountryOutlineOpacity: 1,
      baseCountryGlowColor: '#707070',
      baseCountryGlowWidth: 0,
      baseCountryGlowOpacity: 0,
      activeCountryCodes: [],
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
        presets: {
          short: createPreset(0.05, 0.08, 1.5, 64),
          medium: createPreset(0.08, 0.16, 1.8, 100),
          long: createPreset(0.12, 0.24, 2.2, 140),
        },
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
