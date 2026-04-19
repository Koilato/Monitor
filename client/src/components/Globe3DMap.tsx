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
  coords: Array<{ lat: number; lng: number }>;
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
    anchor: mouseEvent ? { x: mouseEvent.clientX, y: mouseEvent.clientY } : null,
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
      boundaryPathsRef.current = polygons.flatMap((polygon) => geometryToBoundaryPaths(polygon.feature.geometry));

      globe
        .globeImageUrl('/textures/earth-topo-bathy.jpg')
        .bumpImageUrl('/textures/earth-water.png')
        .backgroundImageUrl('/textures/night-sky.png')
        .pathsData(boundaryPathsRef.current)
        .pathPoints((datum: object) => (datum as GlobeBoundaryPath).coords)
        .pathPointLat((datum: { lat: number }) => datum.lat)
        .pathPointLng((datum: { lng: number }) => datum.lng)
        .pathColor(() => 'rgba(226,232,240,0.55)')
        .pathStroke(() => 0.35)
        .polygonsData([])
        .polygonCapColor((datum: object) => {
          const feature = datum as Feature<Geometry>;
          const code = feature.properties?.['ISO3166-1-Alpha-2'];
          return code === hoveredCodeRef.current ? 'rgba(37,99,235,0.42)' : 'rgba(148,163,184,0.0)';
        })
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor(() => 'rgba(226,232,240,0.45)')
        .polygonAltitude((datum: object) => {
          const feature = datum as Feature<Geometry>;
          const code = feature.properties?.['ISO3166-1-Alpha-2'];
          return code === hoveredCodeRef.current ? 0.006 : 0;
        })
        .polygonsTransitionDuration(150)
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

      globe.pointOfView({ lat: 24, lng: 105, altitude: 2.1 }, 0);

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
          currentGlobe.polygonsData([]);
          emitHover(hoverHandlerRef.current, null, null);
          return;
        }

        const hit = await getCountryAtCoordinates(coordinates.lat, coordinates.lng);
        if (!hit) {
          if (hoveredCodeRef.current) {
            hoveredCodeRef.current = null;
            currentGlobe.polygonsData([]);
            emitHover(hoverHandlerRef.current, null, null);
          }
          return;
        }

        hoveredCodeRef.current = hit.code;
        currentGlobe.polygonsData(
          polygonsRef.current
            .filter((polygon) => polygon.code === hit.code)
            .map((polygon) => polygon.feature),
        );
        emitHover(hoverHandlerRef.current, { code: hit.code, name: hit.name }, event);
      });

      canvas.addEventListener('mouseleave', () => {
        hoveredCodeRef.current = null;
        globe.polygonsData([]);
        emitHover(hoverHandlerRef.current, null, null);
      });
    }

    mountGlobe().catch((error) => {
      console.error('Failed to mount globe', error);
    });

    return () => {
      removed = true;
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
    globe.polygonsData(
      hoveredCountryCode
        ? polygonsRef.current
          .filter((polygon) => polygon.code === hoveredCountryCode)
          .map((polygon) => polygon.feature)
        : [],
    );
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

function geometryToBoundaryPaths(geometry: Geometry): GlobeBoundaryPath[] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates
      .slice(0, 1)
      .map((ring) => ({
        coords: ring.map(([lng, lat]) => ({ lat, lng })),
      }));
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) => polygon.slice(0, 1).map((ring) => ({
      coords: ring.map(([lng, lat]) => ({ lat, lng })),
    })));
  }

  return [];
}
