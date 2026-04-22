import { useCallback, useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange, ThreatMapResponse } from '@shared/types';
import { fetchCountryHover, fetchThreatMap } from 'shared/api/client';
import { getCountryCentroid } from 'map/lib/country-geometry';
import { timeFilterToDateRange, type TimeFilterState } from 'map/state/map-state';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from 'map/state/map-types';

export interface TwoDArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  arrowPosition: [number, number];
  label: string;
  count: number;
  angle: number;
}

export interface MapDataSyncState {
  dateRange: DateRange;
  hoveredCountry: HoverCountryState | null;
  popupAnchor: PopupAnchor | null;
  hoverData: CountryHoverResponse | null;
  threatData: ThreatMapResponse | null;
  loading: boolean;
  threatLoading: boolean;
  error: string | null;
  threatError: string | null;
  panelCount: number;
  statusTone: 'error' | 'warning' | 'live';
  statusLabel: string;
  handleCountryHover: (event: CountryHoverEvent) => void;
}

interface UseMapDataSyncInput {
  timeFilter: TimeFilterState;
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

export function useMapDataSync(input: UseMapDataSyncInput): MapDataSyncState {
  const dateRange = timeFilterToDateRange(input.timeFilter);
  const [hoveredCountry, setHoveredCountry] = useState<HoverCountryState | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const [hoverData, setHoverData] = useState<CountryHoverResponse | null>(null);
  const [threatData, setThreatData] = useState<ThreatMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [threatLoading, setThreatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threatError, setThreatError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const threatRequestRef = useRef<AbortController | null>(null);
  const threatRequestIdRef = useRef(0);
  const activeCountryRef = useRef<string | null>(null);
  const activeRangeRef = useRef(serializeDateRange(dateRange));
  const latestRangeRef = useRef<DateRange>(dateRange);

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

  const startThreatRequest = useCallback(async (range: DateRange) => {
    threatRequestRef.current?.abort();

    const controller = new AbortController();
    threatRequestRef.current = controller;

    const requestId = threatRequestIdRef.current + 1;
    threatRequestIdRef.current = requestId;

    setThreatLoading(true);
    setThreatError(null);

    try {
      const response = await fetchThreatMap(range, controller.signal);
      if (controller.signal.aborted || threatRequestIdRef.current !== requestId) {
        return;
      }
      setThreatData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || controller.signal.aborted || threatRequestIdRef.current !== requestId) {
        return;
      }
      setThreatData(null);
      setThreatError((fetchError as Error).message);
    } finally {
      if (!controller.signal.aborted && threatRequestIdRef.current === requestId) {
        setThreatLoading(false);
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
    void startThreatRequest(dateRange);
    if (!hoveredCountry || nextRange === activeRangeRef.current) {
      return;
    }

    void startHoverRequest(hoveredCountry, dateRange, true);
  }, [dateRange, hoveredCountry, startHoverRequest, startThreatRequest]);

  useEffect(() => () => {
    requestRef.current?.abort();
    threatRequestRef.current?.abort();
  }, []);

  const panelCount = hoveredCountry ? hoverData?.total ?? 0 : 0;
  const statusTone = error || threatError ? 'error' : loading || threatLoading ? 'warning' : 'live';
  const statusLabel = error
    ? 'QUERY ERROR'
    : threatError
      ? 'MAP ERROR'
      : loading
        ? 'QUERYING'
        : threatLoading
          ? 'FILTERING MAP'
          : hoveredCountry
            ? `TRACKING ${hoveredCountry.code}`
            : 'LIVE MAP FEED';

  return {
    dateRange,
    hoveredCountry,
    popupAnchor,
    hoverData,
    threatData,
    loading,
    threatLoading,
    error,
    threatError,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  };
}
