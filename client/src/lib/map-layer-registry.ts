import type { ThreatMapResponse } from '@shared/types';

import { createBaseLayerModule, createThreatLayerModule } from './map-layer-modules';

export type LayerModuleId = 'base' | 'threat';

export type LayerModulePhase = 'install' | 'refresh' | 'dispose';

export interface LayerModuleSourceHandle {
  setData(data: unknown): void;
}

export interface LayerModuleMap {
  addSource(
    id: string,
    source: {
      type: 'geojson';
      data: unknown;
    },
  ): void;
  getSource(id: string): LayerModuleSourceHandle | undefined;
  addLayer(layer: {
    id: string;
    type: 'background' | 'fill' | 'line';
    source?: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    filter?: unknown;
    beforeId?: string;
  }): void;
  getLayer(id: string): unknown;
  setPaintProperty(layerId: string, property: string, value: unknown): void;
  removeLayer(id: string): void;
  removeSource(id: string): void;
}

export interface LayerModuleContext {
  map: LayerModuleMap;
  threatData: ThreatMapResponse | null;
}

export interface LayerModuleExecutionResult {
  moduleId: LayerModuleId;
  phase: LayerModulePhase;
  ok: boolean;
  error: unknown | null;
}

export interface LayerModule {
  id: LayerModuleId;
  label: string;
  install(context: LayerModuleContext): Promise<void> | void;
  refresh?(context: LayerModuleContext): Promise<void> | void;
  dispose?(context: LayerModuleContext): Promise<void> | void;
}

function runLayerModulePhase(
  module: LayerModule,
  phase: LayerModulePhase,
  context: LayerModuleContext,
): Promise<void> | void {
  if (phase === 'install') {
    return module.install(context);
  }

  if (phase === 'refresh') {
    return module.refresh?.(context);
  }

  return module.dispose?.(context);
}

export function getDefaultLayerModules(): LayerModule[] {
  return [
    createBaseLayerModule(),
    createThreatLayerModule(),
  ];
}

export function getLayerModuleById(
  modules: readonly LayerModule[],
  id: LayerModuleId,
): LayerModule | undefined {
  return modules.find((module) => module.id === id);
}

export async function runLayerModuleSafely(
  module: LayerModule,
  phase: LayerModulePhase,
  context: LayerModuleContext,
): Promise<LayerModuleExecutionResult> {
  try {
    await runLayerModulePhase(module, phase, context);
    return {
      moduleId: module.id,
      phase,
      ok: true,
      error: null,
    };
  } catch (error) {
    return {
      moduleId: module.id,
      phase,
      ok: false,
      error,
    };
  }
}

export async function runLayerModulesSafely(
  modules: readonly LayerModule[],
  phase: LayerModulePhase,
  context: LayerModuleContext,
): Promise<LayerModuleExecutionResult[]> {
  const orderedModules = phase === 'dispose' ? [...modules].reverse() : [...modules];
  const results: LayerModuleExecutionResult[] = [];

  for (const module of orderedModules) {
    results.push(await runLayerModuleSafely(module, phase, context));
  }

  return results;
}
