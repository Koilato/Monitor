import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';
import type { GlobeInstance } from 'globe.gl';
import { getCountriesGeoJson, getCountryAtCoordinates } from '../lib/country-geometry';
import type { CountryHoverEvent, MapViewProps } from '../lib/types';
import {
  buildGlobeArcData,
  buildGlobeBoundaryPaths,
  createHoverAnchor,
  getGlobeBoundaryPathsForHover,
  type GlobeArrowDatum,
  type GlobeBoundaryPath,
} from '../hooks/useMapDataSync';
import '../styles/map-3d.css';

function emitHover(
  callback: (event: CountryHoverEvent) => void,
  country: CountryHoverEvent['country'],
  mouseEvent: MouseEvent | null,
) {
  callback({
    country,
    anchor: mouseEvent ? createHoverAnchor('3d', mouseEvent.clientX, mouseEvent.clientY) : null,
  });
}

export function Globe3DMap(props: MapViewProps) {
  const { hoveredCountryCode, data, onCountryHover, debugSettings } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
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
      boundaryPathsRef.current = buildGlobeBoundaryPaths(geojson);

      globe
        .globeImageUrl('/textures/earth-topo-bathy.jpg')
        .bumpImageUrl('/textures/earth-water.png')
        .backgroundImageUrl('/textures/night-sky.png')
        .pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, null))
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

      globe.pointOfView({
        lat: debugSettings.threeD.povLat,
        lng: debugSettings.threeD.povLng,
        altitude: debugSettings.threeD.povAltitude,
      }, 0);

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
          currentGlobe.pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, null));
          emitHover(hoverHandlerRef.current, null, null);
          return;
        }

        const hit = await getCountryAtCoordinates(coordinates.lat, coordinates.lng);
        if (!hit) {
          if (hoveredCodeRef.current) {
            hoveredCodeRef.current = null;
            currentGlobe.pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, null));
            emitHover(hoverHandlerRef.current, null, null);
          }
          return;
        }

        hoveredCodeRef.current = hit.code;
        currentGlobe.pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, hit.code));
        emitHover(hoverHandlerRef.current, { code: hit.code, name: hit.name }, event);
      });

      canvas.addEventListener('mouseleave', () => {
        hoveredCodeRef.current = null;
        globe.pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, null));
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
    globe.pathsData(getGlobeBoundaryPathsForHover(boundaryPathsRef.current, hoveredCountryCode));
  }, [hoveredCountryCode]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }

    globe.pointOfView({
      lat: debugSettings.threeD.povLat,
      lng: debugSettings.threeD.povLng,
      altitude: debugSettings.threeD.povAltitude,
    }, 0);
  }, [
    debugSettings.threeD.povAltitude,
    debugSettings.threeD.povLat,
    debugSettings.threeD.povLng,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function syncGlobeData() {
      const globe = globeRef.current;
      if (!globe || !data) {
        globe?.arcsData([]);
        globe?.pointsData([]);
        return;
      }

      const syncData = await buildGlobeArcData(data);
      if (!cancelled) {
        globe.arcsData(syncData.arcs);
        globe.pointsData(syncData.arrowheads);
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
    <div className="globe-map-wrapper globe-map-wrapper--3d">
      <div className="map-surface globe-surface" ref={containerRef} />
      <div className="deckgl-timestamp globe-timestamp">
        {data ? `${data.victimCountry} / ${data.total} INCIDENTS / ${data.flows.length} FLOWS` : '3D GLOBE MODE'}
      </div>
      <div className="globe-beta-badge">GLOBE</div>
    </div>
  );
}
