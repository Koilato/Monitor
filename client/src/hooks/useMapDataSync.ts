import { useCallback, useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange } from '@shared/types';
import type { FeatureCollection, Geometry } from 'geojson';
import { fetchCountryHover } from '../lib/api';
import { getCountryCentroid } from '../lib/country-geometry';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from '../lib/types';

const DEFAULT_DATE_RANGE: DateRange = {
  startDate: null,
  endDate: null,
};

export interface TwoDArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  arrowPosition: [number, number];
  label: string;
  count: number;
  angle: number;
}

export interface GlobeBoundaryPath {
  code: string;
  coords: Array<{ lat: number; lng: number }>;
  highlight?: boolean;
}

export interface GlobeArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
}

export interface GlobeArrowDatum {
  lat: number;
  lng: number;
}

export interface MapDataSyncState {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  hoveredCountry: HoverCountryState | null;
  popupAnchor: PopupAnchor | null;
  hoverData: CountryHoverResponse | null;
  loading: boolean;
  error: string | null;
  panelCount: number;
  statusTone: 'error' | 'warning' | 'live';
  statusLabel: string;
  handleCountryHover: (event: CountryHoverEvent) => void;
}

function serializeDateRange(range: DateRange): string {
  return `${range.startDate ?? ''}__${range.endDate ?? ''}`;
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: string }).name === 'AbortError';
}

export function createHoverAnchor(mode: '2d' | '3d', x: number, y: number): PopupAnchor {
  return {
    x,
    y,
    mode,
    placement: x >= window.innerWidth / 2 ? 'left' : 'right',
  };
}

function getBearing(source: [number, number], target: [number, number]): number {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function interpolatePosition(
  source: [number, number],
  target: [number, number],
  t: number,
): [number, number] {
  return [
    source[0] + ((target[0] - source[0]) * t),
    source[1] + ((target[1] - source[1]) * t),
  ];
}

function geometryToBoundaryPaths(code: string, geometry: Geometry): GlobeBoundaryPath[] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.slice(0, 1).map((ring) => ({
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

export async function buildTwoDArcData(data: CountryHoverResponse | null): Promise<TwoDArcDatum[]> {
  if (!data) {
    return [];
  }

  const target = await getCountryCentroid(data.victimCountry);
  if (!target) {
    return [];
  }

  const rows = await Promise.all(data.flows.map(async (flow) => {
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
      arrowPosition: interpolatePosition(sourcePosition, targetPosition, 0.975),
      label: `${flow.attackerCountry} → ${flow.victimCountry}`,
      count: flow.count,
      angle: getBearing(sourcePosition, targetPosition),
    };
  }));

  return rows.filter((row): row is TwoDArcDatum => row !== null);
}

export function buildGlobeBoundaryPaths(geojson: FeatureCollection<Geometry>): GlobeBoundaryPath[] {
  return geojson.features.flatMap((feature) => {
    const code = feature.properties?.['ISO3166-1-Alpha-2'];
    if (typeof code !== 'string' || feature.geometry == null) {
      return [];
    }

    return geometryToBoundaryPaths(code, feature.geometry);
  });
}

export function getGlobeBoundaryPathsForHover(
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

export async function buildGlobeArcData(data: CountryHoverResponse | null): Promise<{
  arcs: GlobeArcDatum[];
  arrowheads: GlobeArrowDatum[];
}> {
  if (!data) {
    return {
      arcs: [],
      arrowheads: [],
    };
  }

  const target = await getCountryCentroid(data.victimCountry);
  if (!target) {
    return {
      arcs: [],
      arrowheads: [],
    };
  }

  const rows = await Promise.all(data.flows.map(async (flow) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    if (!source) {
      return null;
    }

    return {
      arc: {
        startLat: source.lat,
        startLng: source.lon,
        endLat: target.lat,
        endLng: target.lon,
        color: '#38bdf8',
        label: `${flow.attackerCountry} → ${flow.victimCountry} (${flow.count})`,
      } satisfies GlobeArcDatum,
      arrowhead: {
        lat: target.lat,
        lng: target.lon,
      } satisfies GlobeArrowDatum,
    };
  }));

  const filtered = rows.filter((row): row is NonNullable<typeof row> => row !== null);
  return {
    arcs: filtered.map((row) => row.arc),
    arrowheads: filtered.map((row) => row.arrowhead),
  };
}

export function useMapDataSync(): MapDataSyncState {
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [hoveredCountry, setHoveredCountry] = useState<HoverCountryState | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const [hoverData, setHoverData] = useState<CountryHoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const activeCountryRef = useRef<string | null>(null);
  const activeRangeRef = useRef(serializeDateRange(DEFAULT_DATE_RANGE));
  const latestRangeRef = useRef<DateRange>(DEFAULT_DATE_RANGE);

  const startHoverRequest = useCallback(async (
    country: HoverCountryState,
    range: DateRange,
    force = false,
  ) => {
    const rangeState = serializeDateRange(range);
    if (!force
      && activeCountryRef.current === country.code
      && activeRangeRef.current === rangeState) {
      return;
    }

    activeCountryRef.current = country.code;
    activeRangeRef.current = rangeState;
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchCountryHover(country.code, range, controller.signal);
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }
      setHoverData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }
      setHoverData(null);
      setError((fetchError as Error).message);
    } finally {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const handleCountryHover = useCallback((event: CountryHoverEvent) => {
    setPopupAnchor(event.anchor);

    if (!event.country) {
      activeCountryRef.current = null;
      activeRangeRef.current = serializeDateRange(latestRangeRef.current);
      requestRef.current?.abort();
      requestRef.current = null;
      setHoveredCountry(null);
      setHoverData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setHoveredCountry(event.country);
    void startHoverRequest(event.country, latestRangeRef.current);
  }, [startHoverRequest]);

  useEffect(() => {
    latestRangeRef.current = dateRange;
    const nextRange = serializeDateRange(dateRange);
    if (!hoveredCountry || nextRange === activeRangeRef.current) {
      return;
    }

    void startHoverRequest(hoveredCountry, dateRange, true);
  }, [dateRange, hoveredCountry, startHoverRequest]);

  useEffect(() => () => {
    requestRef.current?.abort();
  }, []);

  const panelCount = hoveredCountry ? hoverData?.total ?? 0 : 0;
  const statusTone = error ? 'error' : loading ? 'warning' : 'live';
  const statusLabel = error
    ? 'QUERY ERROR'
    : loading
      ? 'QUERYING'
      : hoveredCountry
        ? `TRACKING ${hoveredCountry.code}`
        : 'LIVE MOCK FEED';

  return {
    dateRange,
    setDateRange,
    hoveredCountry,
    popupAnchor,
    hoverData,
    loading,
    error,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  };
}
