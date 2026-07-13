import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';

import { createMapEventBridge, isCameraSynced, syncModuleVisibility } from 'map/lib/map-runtime';
import { getCountriesGeoJson, setCountryCenterOverrides } from 'map/lib/country-geometry';
import { LAYER_MODULES } from 'map/layers/modules';
import { getBasemapStyleUrl } from 'map/lib/map-style';
import {
  calculateWorldOverviewBounds,
  normalizeWorldLongitude,
  WORLD_CENTER_LONGITUDE,
  WORLD_OVERVIEW_PADDING,
  type WorldOverviewBounds,
} from 'map/lib/world-overview';
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
  fitWorldOverview: (duration?: number) => Promise<boolean>;
}

const MAX_MAP_LATITUDE = 85;

export function useMapRuntime(props: MapViewProps): UseMapRuntimeResult {
  const {
    mapState,
    themeRevision,
    flowData,
    threatData,
    onCountrySelect,
    onCameraChange,
    debugSettings,
    fitWorldOnLoad,
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
  const didFitWorldRef = useRef(false);
  const keepWorldFittedRef = useRef(fitWorldOnLoad);
  const fittingWorldRef = useRef(false);
  const worldBoundsRef = useRef<WorldOverviewBounds | null>(null);
  const zoomLimitsRef = useRef({
    min: debugSettings.minZoom,
    max: debugSettings.maxZoom,
  });

  onCountrySelectRef.current = onCountrySelect;
  onCameraChangeRef.current = onCameraChange;
  zoomLimitsRef.current = {
    min: debugSettings.minZoom,
    max: debugSettings.maxZoom,
  };

  if (!eventBridgeRef.current) {
    eventBridgeRef.current = createMapEventBridge({
      getCountrySelectHandler: () => onCountrySelectRef.current,
      getCameraChangeHandler: () => onCameraChangeRef.current,
      suppressMoveSyncRef,
    });
  }

  const fitWorldOverview = useCallback(async (duration = 0): Promise<boolean> => {
    const map = mapRef.current;
    if (!map) {
      return false;
    }

    try {
      const bounds = worldBoundsRef.current
        ?? calculateWorldOverviewBounds(await getCountriesGeoJson());
      if (!bounds) {
        return false;
      }

      worldBoundsRef.current = bounds;
      keepWorldFittedRef.current = true;
      fittingWorldRef.current = true;
      map.fitBounds(bounds, {
        duration,
        padding: WORLD_OVERVIEW_PADDING,
      });
      return true;
    } catch (error) {
      console.error('Failed to fit world overview', error);
      return false;
    }
  }, []);

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
      transformConstrain: (center, zoom) => ({
        center: new maplibregl.LngLat(
          normalizeWorldLongitude(center.lng),
          Math.max(-MAX_MAP_LATITUDE, Math.min(MAX_MAP_LATITUDE, center.lat)),
        ),
        zoom: Math.max(
          zoomLimitsRef.current.min,
          Math.min(zoomLimitsRef.current.max, zoom),
        ),
      }),
      attributionControl: false,
      localIdeographFontFamily: 'sans-serif',
    });

    mapRef.current = map;

    if (fitWorldOnLoad) {
      map.setCenter([WORLD_CENTER_LONGITUDE, mapState.camera.lat]);
    }

    map.once('load', async () => {
      setStyleReady(true);
      map.setProjection({ type: 'mercator' });
      map.on('movestart', (event) => {
        const fromResize = Boolean((event as unknown as { 0?: unknown })[0]);
        if (!fromResize && !fittingWorldRef.current && !suppressMoveSyncRef.current) {
          keepWorldFittedRef.current = false;
        }
      });
      map.on('click', (event) => {
        eventBridgeRef.current?.handleClick(map as never, event as never);
      });
      map.on('moveend', () => {
        fittingWorldRef.current = false;
        eventBridgeRef.current?.handleMoveEnd(map as never);
      });
      map.on('resize', () => {
        if (keepWorldFittedRef.current && worldBoundsRef.current) {
          void fitWorldOverview();
        }
      });

      if (fitWorldOnLoad && !didFitWorldRef.current) {
        didFitWorldRef.current = true;
        await fitWorldOverview();
      }
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
    fitWorldOverview,
  };
}
