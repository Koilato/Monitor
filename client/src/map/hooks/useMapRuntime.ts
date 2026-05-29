import { useEffect, useRef, useState, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';

import { createMapEventBridge, isCameraSynced, syncModuleVisibility } from 'map/lib/map-runtime';
import { setCountryCenterOverrides } from 'map/lib/country-geometry';
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
    mapState,
    themeRevision,
    flowData,
    threatData,
    onCountrySelect,
    onCameraChange,
    debugSettings,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const activeModulesRef = useRef<LayerModule[]>([]);
  const failedModuleIdsRef = useRef<string[]>([]);
  const suppressMoveSyncRef = useRef(false);
  const [styleReady, setStyleReady] = useState(false);
  const onCountrySelectRef = useRef(onCountrySelect);
  const onCameraChangeRef = useRef(onCameraChange);
  const eventBridgeRef = useRef<ReturnType<typeof createMapEventBridge> | null>(null);

  onCountrySelectRef.current = onCountrySelect;
  onCameraChangeRef.current = onCameraChange;

  if (!eventBridgeRef.current) {
    eventBridgeRef.current = createMapEventBridge({
      getCountrySelectHandler: () => onCountrySelectRef.current,
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

    map.once('load', () => {
      setStyleReady(true);
      map.setProjection({ type: 'mercator' });
      map.on('click', (event) => {
        eventBridgeRef.current?.handleClick(map as never, event as never);
      });
      map.on('moveend', () => {
        eventBridgeRef.current?.handleMoveEnd(map as never);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    setCountryCenterOverrides(debugSettings.countryCenterOverrides);
  }, [debugSettings.countryCenterOverrides]);

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

    map.setProjection({ type: 'mercator' });
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
  }, [mapState.camera, styleReady]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !styleReady || !mapInstance.isStyleLoaded()) {
      return;
    }
    const activeMap = mapInstance;

    let cancelled = false;

    async function syncModules() {
      const initResult = await initializeLayerModules({
        map: activeMap,
        activeLayerIds: mapState.activeLayerIds,
        debugSettings,
        flowData,
        threatData,
        hoveredCountryCode: null,
        modules: LAYER_MODULES,
      });
      if (cancelled) {
        return;
      }

      activeModulesRef.current = initResult.activeModules;
      failedModuleIdsRef.current = initResult.failedModuleIds;
      syncModuleVisibility(activeMap, LAYER_MODULES, mapState.activeLayerIds);

      const syncResult = await synchronizeLayerModules({
        map: activeMap,
        activeLayerIds: mapState.activeLayerIds,
        debugSettings,
        flowData,
        threatData,
        hoveredCountryCode: null,
        activeModules: activeModulesRef.current,
        failedModuleIds: failedModuleIdsRef.current,
      });
      if (cancelled) {
        return;
      }

      failedModuleIdsRef.current = syncResult.failedModuleIds;
    }

    syncModules().catch((error) => {
      console.error('Failed to sync unified map modules', error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    flowData,
    mapState.activeLayerIds,
    styleReady,
    threatData,
    debugSettings,
    themeRevision,
  ]);

  return {
    containerRef,
    mapRef,
    mapReady: styleReady,
  };
}
