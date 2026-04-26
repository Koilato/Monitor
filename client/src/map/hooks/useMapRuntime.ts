import { useEffect, useRef, useState, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { MapboxOverlayProps } from '@deck.gl/mapbox';

import { createMapEventBridge, isCameraSynced, syncModuleVisibility } from 'map/lib/map-runtime';
import { LAYER_MODULES } from 'map/layers/modules';
import { getBasemapStyleUrl } from 'map/lib/map-style';
import {
  initializeLayerModules,
  synchronizeLayerModules,
  type LayerModule,
} from 'map/layers/registry';
import type { MapViewProps } from 'map/state/map-types';

interface UseMapRuntimeResult {
  containerRef: RefObject<HTMLDivElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  mapReady: boolean;
}

export function useMapRuntime(props: MapViewProps): UseMapRuntimeResult {
  const {
    viewMode,
    mapState,
    themeRevision,
    hoveredCountryCode,
    hoverData,
    flowData,
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
  const suppressMoveSyncRef = useRef(false);
  const [styleReady, setStyleReady] = useState(false);
  const viewModeRef = useRef(viewMode);
  const onCountryHoverRef = useRef(onCountryHover);
  const onCameraChangeRef = useRef(onCameraChange);
  const eventBridgeRef = useRef<ReturnType<typeof createMapEventBridge> | null>(null);

  viewModeRef.current = viewMode;
  onCountryHoverRef.current = onCountryHover;
  onCameraChangeRef.current = onCameraChange;

  if (!eventBridgeRef.current) {
    eventBridgeRef.current = createMapEventBridge({
      getViewMode: () => viewModeRef.current,
      getCountryHoverHandler: () => onCountryHoverRef.current,
      getCameraChangeHandler: () => onCameraChangeRef.current,
      suppressMoveSyncRef,
    });
  }

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

    map.once('load', () => {
      setStyleReady(true);
      map.on('mousemove', (event) => {
        eventBridgeRef.current?.handleMouseMove(map as never, event as never);
      });
      map.on('mouseout', () => {
        eventBridgeRef.current?.handleMouseOut(map as never);
      });
      map.on('moveend', () => {
        eventBridgeRef.current?.handleMoveEnd(map as never);
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
        activeThreatCountryCodes: debugSettings.activeCountryCodes,
        hoverData,
        flowData,
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
        activeThreatCountryCodes: debugSettings.activeCountryCodes,
        hoverData,
        flowData,
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
  }, [
    hoverData,
    flowData,
    hoveredCountryCode,
    mapState.activeLayerIds,
    styleReady,
    threatData,
    viewMode,
    debugSettings.activeCountryCodes,
    themeRevision,
  ]);

  return {
    containerRef,
    mapRef,
    mapReady: styleReady,
  };
}
