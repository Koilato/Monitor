import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';
import type { GlobeInstance } from 'globe.gl';
import type { Feature, Geometry } from 'geojson';
import { getCountriesGeoJson, getCountryAtCoordinates, getCountryCentroid } from '../lib/country-geometry';
import type { CountryHoverEvent, MapViewProps } from '../lib/types';

interface GlobePolygonDatum {
  code: string;
  name: string;
  feature: Feature<Geometry>;
}

interface GlobeBoundaryPath {
  code: string;
  coords: Array<{ lat: number; lng: number }>;
  highlight?: boolean;
}

interface GlobeArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
}

interface GlobeArrowDatum {
  lat: number;
  lng: number;
}

function emitHover(
  callback: (event: CountryHoverEvent) => void,
  country: CountryHoverEvent['country'],
  mouseEvent: MouseEvent | null,
) {
  callback({
    country,
    anchor: mouseEvent ? {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      mode: '3d',
      placement: mouseEvent.clientX >= window.innerWidth / 2 ? 'left' : 'right',
    } : null,
  });
}

export function Globe3DMap(props: MapViewProps) {
  const { hoveredCountryCode, data, onCountryHover } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const polygonsRef = useRef<GlobePolygonDatum[]>([]);
  const boundaryPathsRef = useRef<GlobeBoundaryPath[]>([]);
  const hoveredCodeRef = useRef<string | null>(null);
  const hoverHandlerRef = useRef(onCountryHover);

  hoverHandlerRef.current = onCountryHover;

  useEffect(() => {
    if (!containerRef.current || globeRef.current) {
      return;
    }

    let removed = false;
    let resizeObserver: ResizeObserver | null = null;

    async function mountGlobe() {
      const geojson = await getCountriesGeoJson();
      if (removed || !containerRef.current) {
        return;
      }

      const globe = new Globe(containerRef.current) as GlobeInstance;
      globeRef.current = globe;

      const polygons = geojson.features
        .map((feature) => {
          const code = feature.properties?.['ISO3166-1-Alpha-2'];
          const name = feature.properties?.name;
          if (typeof code !== 'string' || typeof name !== 'string' || feature.geometry == null) {
            return null;
          }

          return {
            code,
            name,
            feature,
          };
        })
        .filter((feature): feature is GlobePolygonDatum => feature !== null);

      polygonsRef.current = polygons;
      boundaryPathsRef.current = polygons.flatMap((polygon) => geometryToBoundaryPaths(polygon.code, polygon.feature.geometry));

      globe
        .globeImageUrl('/textures/earth-topo-bathy.jpg')
        .bumpImageUrl('/textures/earth-water.png')
        .backgroundImageUrl('/textures/night-sky.png')
        .pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, null))
        .pathPoints((datum: object) => (datum as GlobeBoundaryPath).coords)
        .pathPointLat((datum: { lat: number }) => datum.lat)
        .pathPointLng((datum: { lng: number }) => datum.lng)
        .pathColor((datum: object) => {
          const row = datum as GlobeBoundaryPath;
          return row.highlight ? 'rgba(96,255,182,0.98)' : 'rgba(226,232,240,0.45)';
        })
        .pathStroke((datum: object) => {
          const row = datum as GlobeBoundaryPath;
          return row.highlight ? 1.15 : 0.35;
        })
        .arcColor('color')
        .arcStroke(0.75)
        .arcAltitude(0.25)
        .arcDashLength(0.6)
        .arcDashGap(0.15)
        .arcDashAnimateTime(1800)
        .pointLat((datum: object) => (datum as GlobeArrowDatum).lat)
        .pointLng((datum: object) => (datum as GlobeArrowDatum).lng)
        .pointAltitude(() => 0.015)
        .pointRadius(() => 0.45)
        .pointColor(() => '#fb7185');

      globe.pointOfView({ lat: 24, lng: 105, altitude: 2.45 }, 0);

      resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current || !globeRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        globeRef.current.width(rect.width);
        globeRef.current.height(rect.height);
      });
      resizeObserver.observe(containerRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      globe.width(rect.width);
      globe.height(rect.height);

      const canvas = containerRef.current.querySelector('canvas');
      if (!canvas) {
        return;
      }

      canvas.addEventListener('mousemove', async (event: MouseEvent) => {
        const currentGlobe = globeRef.current;
        if (!currentGlobe || !containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const coordinates = currentGlobe.toGlobeCoords(
          event.clientX - rect.left,
          event.clientY - rect.top,
        );

        if (!coordinates) {
          hoveredCodeRef.current = null;
          currentGlobe.pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, null));
          emitHover(hoverHandlerRef.current, null, null);
          return;
        }

        const hit = await getCountryAtCoordinates(coordinates.lat, coordinates.lng);
        if (!hit) {
          if (hoveredCodeRef.current) {
            hoveredCodeRef.current = null;
            currentGlobe.pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, null));
            emitHover(hoverHandlerRef.current, null, null);
          }
          return;
        }

        hoveredCodeRef.current = hit.code;
        currentGlobe.pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, hit.code));
        emitHover(hoverHandlerRef.current, { code: hit.code, name: hit.name }, event);
      });

      canvas.addEventListener('mouseleave', () => {
        hoveredCodeRef.current = null;
        globe.pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, null));
        emitHover(hoverHandlerRef.current, null, null);
      });
    }

    mountGlobe().catch((error) => {
      console.error('Failed to mount globe', error);
    });

      return () => {
      removed = true;
      resizeObserver?.disconnect();
      containerRef.current?.replaceChildren();
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    hoveredCodeRef.current = hoveredCountryCode;
    const globe = globeRef.current;
    if (!globe) {
      return;
    }
    globe.pathsData(getBoundaryPathsForHover(boundaryPathsRef.current, hoveredCountryCode));
  }, [hoveredCountryCode]);

  useEffect(() => {
    let cancelled = false;

    async function syncGlobeData() {
      const globe = globeRef.current;
      if (!globe || !data) {
        globe?.arcsData([]);
        globe?.pointsData([]);
        return;
      }

      const target = await getCountryCentroid(data.victimCountry);
      if (!target || cancelled) {
        return;
      }

      const arcs: GlobeArcDatum[] = [];
      const arrowheads: GlobeArrowDatum[] = [];

      for (const flow of data.flows) {
        const source = await getCountryCentroid(flow.attackerCountry);
        if (!source) {
          continue;
        }

        arcs.push({
          startLat: source.lat,
          startLng: source.lon,
          endLat: target.lat,
          endLng: target.lon,
          color: '#38bdf8',
          label: `${flow.attackerCountry} → ${flow.victimCountry} (${flow.count})`,
        });

        arrowheads.push({
          lat: target.lat,
          lng: target.lon,
        });
      }

      if (!cancelled) {
        globe.arcsData(arcs);
        globe.pointsData(arrowheads);
      }
    }

    syncGlobeData().catch((error) => {
      console.error('Failed to sync globe arcs', error);
    });

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="globe-map-wrapper">
      <div className="map-surface globe-surface" ref={containerRef} />
      <div className="deckgl-timestamp globe-timestamp">
        {data ? `${data.victimCountry} / ${data.total} INCIDENTS / ${data.flows.length} FLOWS` : '3D GLOBE MODE'}
      </div>
      <div className="globe-beta-badge">GLOBE</div>
    </div>
  );
}

function getBoundaryPathsForHover(
  paths: GlobeBoundaryPath[],
  hoveredCode: string | null,
): GlobeBoundaryPath[] {
  if (!hoveredCode) {
    return paths;
  }

  const highlighted = paths
    .filter((path) => path.code === hoveredCode)
    .map((path) => ({
      ...path,
      highlight: true,
    }));

  return [...paths, ...highlighted];
}

function geometryToBoundaryPaths(code: string, geometry: Geometry): GlobeBoundaryPath[] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates
      .slice(0, 1)
      .map((ring) => ({
        code,
        coords: ring.map(([lng, lat]) => ({ lat, lng })),
      }));
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) => polygon.slice(0, 1).map((ring) => ({
      code,
      coords: ring.map(([lng, lat]) => ({ lat, lng })),
    })));
  }

  return [];
}
