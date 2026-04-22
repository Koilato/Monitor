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
      supportsView: ['2d', '3d'],
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
      supportsView: ['2d'],
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
      supportsView: ['2d'],
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
    deckOverlay: null,
    view: '2d',
    modules,
    activeLayerIds: ['ok-a', 'bad', 'ok-b'],
  });

  assert.deepEqual(result.activeModuleIds, ['ok-a', 'ok-b']);
  assert.deepEqual(result.failedModuleIds, ['bad']);
  assert.equal(result.failures.length, 1);
  assert.deepEqual(calls, ['ok-a:source', 'ok-a:layer', 'ok-b:source', 'ok-b:layer']);
});
