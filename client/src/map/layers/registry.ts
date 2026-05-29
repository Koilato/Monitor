import type { ThreatMapResponse } from '@shared/types';
import type maplibregl from 'maplibre-gl';

import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapDebugSettings } from 'map/state/map-types';

export interface LayerLegendDefinition {
  label: string;
  items: Array<{ label: string; color: string }>;
}

export interface LayerRenderContext {
  map: maplibregl.Map;
  activeLayerIds: string[];
  debugSettings: MapDebugSettings;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  hoveredCountryCode?: string | null;
}

export interface LayerModule {
  id: string;
  label: string;
  defaultEnabled: boolean;
  showInLayerControls?: boolean;
  styleLayerIds?: string[];
  registerMapSources?: (context: LayerRenderContext) => Promise<void> | void;
  registerStyleLayers?: (context: LayerRenderContext) => Promise<void> | void;
  applyState?: (context: LayerRenderContext) => Promise<void> | void;
  legend?: LayerLegendDefinition;
}

export interface LayerModuleFailure {
  moduleId: string;
  error: unknown;
}

export interface LayerModuleInitResult {
  activeModules: LayerModule[];
  activeModuleIds: string[];
  failedModuleIds: string[];
  failures: LayerModuleFailure[];
}

export function isLayerModuleEnabled(module: LayerModule, context: Pick<LayerRenderContext, 'activeLayerIds'>): boolean {
  const isUserFacing = module.showInLayerControls !== false;
  const isEnabledByState = isUserFacing
    ? context.activeLayerIds.includes(module.id)
    : module.defaultEnabled;

  return isEnabledByState;
}

export async function initializeLayerModules(
  context: LayerRenderContext & { modules: LayerModule[] },
): Promise<LayerModuleInitResult> {
  const failures: LayerModuleFailure[] = [];
  const activeModules: LayerModule[] = [];

  for (const module of context.modules) {
    if (!isLayerModuleEnabled(module, context)) {
      continue;
    }

    try {
      await module.registerMapSources?.(context);
      await module.registerStyleLayers?.(context);
      activeModules.push(module);
    } catch (error) {
      failures.push({
        moduleId: module.id,
        error,
      });
      console.error('[layer-module]', module.id, error);
    }
  }

  return {
    activeModules,
    activeModuleIds: activeModules.map((module) => module.id),
    failedModuleIds: failures.map((failure) => failure.moduleId),
    failures,
  };
}

export async function synchronizeLayerModules(
  context: LayerRenderContext & {
    activeModules: LayerModule[];
    failedModuleIds?: string[];
  },
): Promise<{
  failedModuleIds: string[];
  failures: LayerModuleFailure[];
}> {
  const failedModuleIds = new Set(context.failedModuleIds ?? []);
  const failures: LayerModuleFailure[] = [];

  for (const module of context.activeModules) {
    if (failedModuleIds.has(module.id)) {
      continue;
    }

    try {
      await module.applyState?.(context);
    } catch (error) {
      failedModuleIds.add(module.id);
      failures.push({
        moduleId: module.id,
        error,
      });
      console.error('[layer-module]', module.id, error);
    }
  }

  return {
    failedModuleIds: [...failedModuleIds],
    failures,
  };
}
