import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { MapboxOverlayProps } from '@deck.gl/mapbox';

import { createHoverAnchor } from 'map/lib/hover-anchor';
import { LAYER_MODULES } from 'map/layers/modules';
import { getBasemapStyleUrl } from 'map/lib/map-style';
import {
  initializeLayerModules,
  isLayerModuleEnabled,
  synchronizeLayerModules,
  type LayerModule,
} from 'map/layers/registry';
import { DEFAULT_MAP_STATE, type MapCameraState } from 'map/state/map-state';
import type { CountryHoverEvent, MapViewProps } from 'map/state/map-types';
import 'map/styles/renderer.css';

function emitHoverEvent(
  callback: (event: CountryHoverEvent) => void,
  mode: '2d' | '3d',
  country: CountryHoverEvent['country'],
  clientX: number | null,
  clientY: number | null,
) {
  callback({
    country,
    anchor: clientX !== null && clientY !== null ? createHoverAnchor(mode, clientX, clientY) : null,
  });
}

function roughlyEqual(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) <= epsilon;
}

function syncModuleVisibility(
  map: maplibregl.Map,
  modules: LayerModule[],
  activeLayerIds: string[],
  viewMode: '2d' | '3d',
) {
  for (const module of modules) {
    if (!module.styleLayerIds) {
      continue;
    }

    const isVisible = isLayerModuleEnabled(module, {
      view: viewMode,
      activeLayerIds,
    });
    for (const layerId of module.styleLayerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    }
  }
}

function isCameraSynced(map: maplibregl.Map, camera: MapCameraState) {
  const center = map.getCenter();
  return roughlyEqual(center.lng, camera.lng, 0.01)
    && roughlyEqual(center.lat, camera.lat, 0.01)
    && roughlyEqual(map.getZoom(), camera.zoom, 0.01)
    && roughlyEqual(map.getBearing(), camera.bearing, 0.01)
    && roughlyEqual(map.getPitch(), camera.pitch, 0.01);
}

export function MapRenderer(props: MapViewProps) {
  const {
    viewMode,
    mapState,
    hoveredCountryCode,
    data,
    threatData,
    onCountryHover,
    onCameraChange,
    debugSettings,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const activeModulesRef = useRef<LayerModule[]>([]);
  const failedModuleIdsRef = useRef<string[]>([]);
  const currentHoverRef = useRef<string | null>(null);
  const hoverHandlerRef = useRef(onCountryHover);
  const suppressMoveSyncRef = useRef(false);
  const [styleReady, setStyleReady] = useState(false);

  hoverHandlerRef.current = onCountryHover;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapStyleUrl(),
      center: [mapState.camera.lng, mapState.camera.lat],
      zoom: mapState.camera.zoom,
      bearing: mapState.camera.bearing,
      pitch: mapState.camera.pitch,
      minZoom: debugSettings.minZoom,
      maxZoom: debugSettings.maxZoom,
      renderWorldCopies: false,
      attributionControl: false,
      localIdeographFontFamily: 'sans-serif',
    });

    mapRef.current = map;

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    } satisfies MapboxOverlayProps);
    overlayRef.current = overlay;
    map.addControl(overlay);

    map.on('load', () => {
      setStyleReady(true);
      map.on('mousemove', (event) => {
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
          currentHoverRef.current = code;
          map.getCanvas().style.cursor = 'pointer';
          emitHoverEvent(hoverHandlerRef.current, viewMode, {
            code,
            name: name ?? code,
          }, clientX, clientY);
          return;
        }

        currentHoverRef.current = null;
        map.getCanvas().style.cursor = '';
        emitHoverEvent(hoverHandlerRef.current, viewMode, null, null, null);
      });

      map.on('mouseout', () => {
        currentHoverRef.current = null;
        map.getCanvas().style.cursor = '';
        emitHoverEvent(hoverHandlerRef.current, viewMode, null, null, null);
      });

      map.on('moveend', () => {
        if (suppressMoveSyncRef.current) {
          suppressMoveSyncRef.current = false;
          return;
        }

        const center = map.getCenter();
        onCameraChange({
          lng: center.lng,
          lat: center.lat,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      });
    });

    return () => {
      overlay.finalize();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.setMinZoom(debugSettings.minZoom);
    map.setMaxZoom(debugSettings.maxZoom);
  }, [debugSettings.maxZoom, debugSettings.minZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    map.setProjection({ type: viewMode === '3d' ? 'globe' : 'mercator' });
    if (!isCameraSynced(map, mapState.camera)) {
      suppressMoveSyncRef.current = true;
      map.easeTo({
        center: [mapState.camera.lng, mapState.camera.lat],
        zoom: mapState.camera.zoom,
        bearing: mapState.camera.bearing,
        pitch: mapState.camera.pitch,
        duration: 0,
      });
    }
  }, [mapState.camera, styleReady, viewMode]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    const overlayInstance = overlayRef.current;
    if (!mapInstance || !overlayInstance || !styleReady || !mapInstance.isStyleLoaded()) {
      return;
    }
    const activeMap = mapInstance;
    const activeOverlay = overlayInstance;

    let cancelled = false;

    async function syncModules() {
      const initResult = await initializeLayerModules({
        map: activeMap,
        deckOverlay: activeOverlay,
        view: viewMode,
        activeLayerIds: mapState.activeLayerIds,
        data,
        threatData,
        hoveredCountryCode,
        modules: LAYER_MODULES,
      });
      if (cancelled) {
        return;
      }

      activeModulesRef.current = initResult.activeModules;
      failedModuleIdsRef.current = initResult.failedModuleIds;
      syncModuleVisibility(activeMap, LAYER_MODULES, mapState.activeLayerIds, viewMode);

      const syncResult = await synchronizeLayerModules({
        map: activeMap,
        deckOverlay: activeOverlay,
        view: viewMode,
        activeLayerIds: mapState.activeLayerIds,
        data,
        threatData,
        hoveredCountryCode,
        activeModules: activeModulesRef.current,
        failedModuleIds: failedModuleIdsRef.current,
      });
      if (cancelled) {
        return;
      }

      failedModuleIdsRef.current = syncResult.failedModuleIds;
      activeOverlay.setProps({
        layers: syncResult.overlayLayers,
      });
    }

    syncModules().catch((error) => {
      console.error('Failed to sync unified map modules', error);
    });

    return () => {
      cancelled = true;
    };
  }, [data, hoveredCountryCode, mapState.activeLayerIds, styleReady, threatData, viewMode]);

  return (
    <div className="deckgl-map-wrapper deckgl-map-wrapper--2d">
      <div className="map-surface" id="deckgl-basemap" ref={containerRef} />
      <div className="deckgl-controls">
        <div className="zoom-controls">
          <button
            type="button"
            className="map-btn"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
          >
            +
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
          >
            -
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="Reset view"
            onClick={() => {
              const defaults = viewMode === '3d'
                ? {
                  ...DEFAULT_MAP_STATE.camera,
                  zoom: 1.2,
                  pitch: 55,
                }
                : DEFAULT_MAP_STATE.camera;
              onCameraChange(defaults);
            }}
          >
            o
          </button>
        </div>
      </div>
      
    </div>
  );
}
