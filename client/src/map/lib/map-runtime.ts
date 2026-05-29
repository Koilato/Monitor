import type maplibregl from 'maplibre-gl';

import { createPopupAnchor } from 'map/lib/hover-anchor';
import { isLayerModuleEnabled, type LayerModule } from 'map/layers/registry';
import type { MapCameraState } from 'map/state/map-state';
import type { CountrySelectEvent } from 'map/state/map-types';

interface RenderedFeature {
  properties?: Record<string, unknown>;
}

interface MapHoverTarget {
  queryRenderedFeatures(
    point: { x: number; y: number },
    options: { layers: string[] },
  ): RenderedFeature[];
  getCanvas(): {
    style: { cursor: string };
    getBoundingClientRect(): { left: number; top: number };
  };
}

interface MapCameraTarget {
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getBearing(): number;
  getPitch(): number;
}

export type MapRuntimeTarget = maplibregl.Map & MapHoverTarget & MapCameraTarget;

export type MapVisibilityTarget = Pick<maplibregl.Map, 'getLayer' | 'setLayoutProperty'>;

export interface MapEventBridge {
  handleClick(map: MapHoverTarget, event: { point: { x: number; y: number } }): void;
  handleMoveEnd(map: MapCameraTarget): void;
}

export interface MapEventBridgeDeps {
  getCountrySelectHandler: () => (event: CountrySelectEvent) => void;
  getCameraChangeHandler: () => (camera: Partial<MapCameraState>) => void;
  suppressMoveSyncRef: { current: boolean };
}

function emitCountrySelectEvent(
  callback: (event: CountrySelectEvent) => void,
  country: CountrySelectEvent['country'],
  clientX: number | null,
  clientY: number | null,
) {
  callback({
    country,
    anchor: clientX !== null && clientY !== null ? createPopupAnchor(clientX, clientY) : null,
  });
}

export function roughlyEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function isCameraSynced(map: MapCameraTarget, camera: MapCameraState) {
  const center = map.getCenter();
  return roughlyEqual(center.lng, camera.lng, 0.01)
    && roughlyEqual(center.lat, camera.lat, 0.01)
    && roughlyEqual(map.getZoom(), camera.zoom, 0.01)
    && roughlyEqual(map.getBearing(), camera.bearing, 0.01)
    && roughlyEqual(map.getPitch(), camera.pitch, 0.01);
}

export function syncModuleVisibility(
  map: MapVisibilityTarget,
  modules: LayerModule[],
  activeLayerIds: string[],
) {
  for (const module of modules) {
    if (!module.styleLayerIds) {
      continue;
    }

    const isVisible = isLayerModuleEnabled(module, {
      activeLayerIds,
    });

    for (const layerId of module.styleLayerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    }
  }
}

export function createMapEventBridge(deps: MapEventBridgeDeps): MapEventBridge {
  return {
    handleClick(map, event) {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['countries-interactive'],
      });
      const canvasRect = map.getCanvas().getBoundingClientRect();
      const clientX = canvasRect.left + event.point.x;
      const clientY = canvasRect.top + event.point.y;
      const feature = features[0];
      const code = feature?.properties?.['ISO3166-1-Alpha-2'] as string | undefined;
      const name = feature?.properties?.name as string | undefined;

      if (code) {
        emitCountrySelectEvent(deps.getCountrySelectHandler(), {
          code,
          name: name ?? code,
        }, clientX, clientY);
        return;
      }

      emitCountrySelectEvent(deps.getCountrySelectHandler(), null, null, null);
    },
    handleMoveEnd(map) {
      if (deps.suppressMoveSyncRef.current) {
        deps.suppressMoveSyncRef.current = false;
        return;
      }

      const center = map.getCenter();
      deps.getCameraChangeHandler()({
        lng: center.lng,
        lat: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    },
  };
}
