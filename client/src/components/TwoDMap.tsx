import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';
import type { CountryHoverEvent, MapViewProps } from '../lib/types';
import { buildTwoDArcData, createHoverAnchor, type TwoDArcDatum } from '../hooks/useMapDataSync';
import '../styles/map-2d.css';

const DEFAULT_CENTER: [number, number] = [12, 18];
const DEFAULT_ZOOM = 0.92;

const MAP_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#020a08',
      },
    },
  ],
};
const ARROW_ICON_ATLAS = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path
      d="M8 32h30.5"
      stroke="#ffffff"
      stroke-width="4"
      stroke-linecap="round"
    />
    <path
      d="M32 22l16 10-16 10"
      fill="none"
      stroke="#ffffff"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
`)}`;

function emitHoverEvent(
  callback: (event: CountryHoverEvent) => void,
  country: CountryHoverEvent['country'],
  point: maplibregl.Point | null,
) {
  callback({
    country,
    anchor: point ? createHoverAnchor('2d', point.x, point.y) : null,
  });
}

export function TwoDMap(props: MapViewProps) {
  const { hoveredCountryCode, data, onCountryHover } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const currentHoverRef = useRef<string | null>(null);
  const hoverHandlerRef = useRef(onCountryHover);

  hoverHandlerRef.current = onCountryHover;

  const iconLayerProps = useMemo<IconLayerProps<TwoDArcDatum>>(() => ({
    id: 'attack-arrowheads-base',
    data: [] as TwoDArcDatum[],
    iconAtlas: ARROW_ICON_ATLAS,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 64, height: 64, mask: true },
    },
    getIcon: () => 'arrow',
    getPosition: (datum) => datum.arrowPosition,
    getAngle: (datum) => datum.angle,
    getColor: [255, 72, 120, 220],
    getSize: (datum) => Math.min(18, 11 + datum.count * 0.55),
    sizeUnits: 'pixels',
    pickable: false,
  }), []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 1.02,
      renderWorldCopies: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('countries', {
        type: 'geojson',
        data: '/data/countries.geojson',
      });

      map.addLayer({
        id: 'countries-base-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#071310',
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'countries-base-line',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#1f6f5d',
          'line-width': 1.05,
          'line-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'countries-base-glow',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#0dd6a0',
          'line-width': 2.6,
          'line-opacity': 0.16,
        },
      });

      map.addLayer({
        id: 'countries-interactive',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#0f172a',
          'fill-opacity': 0,
        },
      });

      map.addLayer({
        id: 'countries-hover-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#00ffaa',
          'fill-opacity': 0.3,
        },
        filter: ['==', ['get', 'ISO3166-1-Alpha-2'], ''],
      });

      map.addLayer({
        id: 'countries-hover-glow',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#7dffbf',
          'line-width': 5.5,
          'line-opacity': 0.32,
        },
        filter: ['==', ['get', 'ISO3166-1-Alpha-2'], ''],
      });

      map.addLayer({
        id: 'countries-hover-border',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#44ff88',
          'line-width': 2.2,
          'line-opacity': 1,
        },
        filter: ['==', ['get', 'ISO3166-1-Alpha-2'], ''],
      });

      const overlay = new MapboxOverlay({
        interleaved: true,
        layers: [],
      });
      overlayRef.current = overlay;
      map.addControl(overlay);

      map.on('mousemove', (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: ['countries-interactive'],
        });

        const feature = features[0];
        const code = feature?.properties?.['ISO3166-1-Alpha-2'] as string | undefined;
        const name = feature?.properties?.name as string | undefined;

        if (code) {
          if (currentHoverRef.current !== code) {
            currentHoverRef.current = code;
            const filter = ['==', ['get', 'ISO3166-1-Alpha-2'], code] as maplibregl.FilterSpecification;
            map.setFilter('countries-hover-fill', filter);
            map.setFilter('countries-hover-glow', filter);
            map.setFilter('countries-hover-border', filter);
          }

          map.getCanvas().style.cursor = 'pointer';
          emitHoverEvent(hoverHandlerRef.current, {
            code,
            name: name ?? code,
          }, event.point);
          return;
        }

        if (currentHoverRef.current) {
          currentHoverRef.current = null;
          map.setFilter('countries-hover-fill', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
          map.setFilter('countries-hover-glow', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
          map.setFilter('countries-hover-border', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
          map.getCanvas().style.cursor = '';
          emitHoverEvent(hoverHandlerRef.current, null, null);
        }
      });

      map.on('mouseout', () => {
        currentHoverRef.current = null;
        if (map.getLayer('countries-hover-fill')) {
          map.setFilter('countries-hover-fill', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
          map.setFilter('countries-hover-glow', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
          map.setFilter('countries-hover-border', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
        }
        map.getCanvas().style.cursor = '';
        emitHoverEvent(hoverHandlerRef.current, null, null);
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      overlayRef.current?.finalize();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('countries-hover-fill')) {
      return;
    }

    if (!hoveredCountryCode) {
      map.setFilter('countries-hover-fill', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
      map.setFilter('countries-hover-glow', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
      map.setFilter('countries-hover-border', ['==', ['get', 'ISO3166-1-Alpha-2'], '']);
      return;
    }

    const filter = ['==', ['get', 'ISO3166-1-Alpha-2'], hoveredCountryCode] as maplibregl.FilterSpecification;
    map.setFilter('countries-hover-fill', filter);
    map.setFilter('countries-hover-glow', filter);
    map.setFilter('countries-hover-border', filter);
  }, [hoveredCountryCode]);

  useEffect(() => {
    let cancelled = false;

    async function syncLayers() {
      const overlay = overlayRef.current;
      if (!overlay) {
        return;
      }

      const arcData = await buildTwoDArcData(data);
      if (cancelled) {
        return;
      }

      overlay.setProps({
        layers: [
          new ArcLayer<TwoDArcDatum>({
            id: 'attack-arcs-glow',
            data: arcData,
            getSourcePosition: (datum) => datum.source,
            getTargetPosition: (datum) => datum.target,
            getSourceColor: [56, 189, 248, 60],
            getTargetColor: [255, 72, 120, 95],
            getWidth: (datum) => Math.max(3.2, datum.count * 1.8),
            widthUnits: 'pixels',
            pickable: false,
          }),
          new ArcLayer<TwoDArcDatum>({
            id: 'attack-arcs',
            data: arcData,
            getSourcePosition: (datum) => datum.source,
            getTargetPosition: (datum) => datum.target,
            getSourceColor: [56, 189, 248, 225],
            getTargetColor: [255, 72, 120, 245],
            getWidth: (datum) => Math.max(1.6, datum.count * 1.05),
            widthUnits: 'pixels',
            pickable: false,
          }),
          new IconLayer<TwoDArcDatum>({
            ...iconLayerProps,
            id: 'attack-arrowheads',
            data: arcData,
          }),
        ],
      });
    }

    syncLayers().catch((error) => {
      console.error('Failed to sync 2D map layers', error);
    });

    return () => {
      cancelled = true;
    };
  }, [data, iconLayerProps]);

  return (
    <div className="deckgl-map-wrapper">
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
            onClick={() => mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 450 })}
          >
            o
          </button>
        </div>
      </div>
      <div className="deckgl-timestamp">
        {data ? `${data.victimCountry} / ${data.total} INCIDENTS / ${data.flows.length} FLOWS` : 'HOVER A COUNTRY TO QUERY ATTACK FLOWS'}
      </div>
      <div className="deckgl-legend" aria-hidden="true">
        <span className="legend-label-title">FLOW LEGEND</span>
        <span className="legend-item">
          <svg width="22" height="10" viewBox="0 0 64 32" fill="none">
            <path
              d="M4 16h28"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M28 10l12 6-12 6"
              fill="#38bdf8"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="legend-label">ATTACK ARC</span>
        </span>
        <span className="legend-item">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4" fill="#44ff88" fillOpacity="0.5" stroke="#44ff88" />
          </svg>
          <span className="legend-label">HOVERED TARGET</span>
        </span>
      </div>
    </div>
  );
}
