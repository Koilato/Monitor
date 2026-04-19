import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';
import type { CountryHoverResponse } from '@shared/types';
import { getCountryCentroid } from '../lib/country-geometry';
import type { CountryHoverEvent, MapViewProps } from '../lib/types';

interface ArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  label: string;
  count: number;
  angle: number;
}

const DEFAULT_CENTER: [number, number] = [12, 18];
const DEFAULT_ZOOM = 1.1;

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
    <polygon points="8,32 56,8 42,32 56,56" fill="#f43f5e" />
  </svg>
`)}`;

function getBearing(source: [number, number], target: [number, number]): number {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

async function buildArcData(data: CountryHoverResponse | null): Promise<ArcDatum[]> {
  if (!data) {
    return [];
  }

  const target = await getCountryCentroid(data.victimCountry);
  if (!target) {
    return [];
  }

  const rows = await Promise.all(data.flows.map(async (flow: CountryHoverResponse['flows'][number]) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    if (!source) {
      return null;
    }

    const sourcePosition: [number, number] = [source.lon, source.lat];
    const targetPosition: [number, number] = [target.lon, target.lat];

    return {
      id: `${flow.attackerCountry}-${flow.victimCountry}`,
      source: sourcePosition,
      target: targetPosition,
      label: `${flow.attackerCountry} → ${flow.victimCountry}`,
      count: flow.count,
      angle: getBearing(sourcePosition, targetPosition),
    };
  }));

  return rows.filter((row: ArcDatum | null): row is ArcDatum => row !== null);
}

function emitHoverEvent(
  callback: (event: CountryHoverEvent) => void,
  country: CountryHoverEvent['country'],
  point: maplibregl.Point | null,
) {
  callback({
    country,
    anchor: point ? {
      x: point.x,
      y: point.y,
      mode: '2d',
      placement: point.x >= window.innerWidth / 2 ? 'left' : 'right',
    } : null,
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

  const iconLayerProps = useMemo<IconLayerProps<ArcDatum>>(() => ({
    id: 'attack-arrowheads',
    data: [],
    iconAtlas: ARROW_ICON_ATLAS,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 64, height: 64, mask: true },
    },
    getIcon: () => 'arrow',
    getPosition: (datum) => datum.target,
    getAngle: (datum) => datum.angle,
    getColor: [255, 72, 120],
    getSize: 30,
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

    return () => {
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

      const arcData = await buildArcData(data);
      if (cancelled) {
        return;
      }

      overlay.setProps({
        layers: [
          new ArcLayer<ArcDatum>({
            id: 'attack-arcs-glow',
            data: arcData,
            getSourcePosition: (datum) => datum.source,
            getTargetPosition: (datum) => datum.target,
            getSourceColor: [56, 189, 248, 60],
            getTargetColor: [255, 72, 120, 110],
            getWidth: (datum) => Math.max(5, datum.count * 2.8),
            widthUnits: 'pixels',
            pickable: false,
          }),
          new ArcLayer<ArcDatum>({
            id: 'attack-arcs',
            data: arcData,
            getSourcePosition: (datum) => datum.source,
            getTargetPosition: (datum) => datum.target,
            getSourceColor: [56, 189, 248, 225],
            getTargetColor: [255, 72, 120, 245],
            getWidth: (datum) => Math.max(2.6, datum.count * 1.65),
            widthUnits: 'pixels',
            pickable: false,
          }),
          new IconLayer<ArcDatum>({
            ...iconLayerProps,
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
          <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
            <path d="M1 4H18" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M14 1L18 4L14 7" stroke="#f43f5e" strokeWidth="1.5" fill="none" />
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
