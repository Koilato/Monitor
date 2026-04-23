import { useCallback, useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange, ThreatMapResponse } from '@shared/types';
import { fetchCountryHover, fetchThreatMap } from 'shared/api/client';
import { createRequestTracker } from 'map/lib/request-tracker';
import { timeFilterToDateRange, type TimeFilterState } from 'map/state/map-state';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from 'map/state/map-types';

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

export function serializeDateRange(range: DateRange): string {
  return `${range.startDate ?? ''}__${range.endDate ?? ''}`;
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: string }).name === 'AbortError';
}

export function useMapDataSync(input: UseMapDataSyncInput): MapDataSyncState {
  const dateRange = timeFilterToDateRange(input.timeFilter);
  const dateRangeKey = serializeDateRange(dateRange);
  const [hoveredCountry, setHoveredCountry] = useState<HoverCountryState | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const [hoverData, setHoverData] = useState<CountryHoverResponse | null>(null);
  const [threatData, setThreatData] = useState<ThreatMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [threatLoading, setThreatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threatError, setThreatError] = useState<string | null>(null);
  const hoverRequestTrackerRef = useRef(createRequestTracker());
  const threatRequestTrackerRef = useRef(createRequestTracker());
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
    const requestTicket = hoverRequestTrackerRef.current.next();

    setLoading(true);
    setError(null);

    try {
      const response = await fetchCountryHover(country.code, range, requestTicket.signal);
      if (requestTicket.signal.aborted || !hoverRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setHoverData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !hoverRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setHoverData(null);
      setError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && hoverRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        setLoading(false);
      }
    }
  }, []);

  const startThreatRequest = useCallback(async (range: DateRange) => {
    const requestTicket = threatRequestTrackerRef.current.next();

    setThreatLoading(true);
    setThreatError(null);

    try {
      const response = await fetchThreatMap(range, requestTicket.signal);
      if (requestTicket.signal.aborted || !threatRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setThreatData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !threatRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setThreatData(null);
      setThreatError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && threatRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        setThreatLoading(false);
      }
    }
  }, []);

  const handleCountryHover = useCallback((event: CountryHoverEvent) => {
    setPopupAnchor(event.anchor);

    if (!event.country) {
      activeCountryRef.current = null;
      activeRangeRef.current = serializeDateRange(latestRangeRef.current);
      hoverRequestTrackerRef.current.abort();
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
    void startThreatRequest(dateRange);
    if (!hoveredCountry || dateRangeKey === activeRangeRef.current) {
      return;
    }

    void startHoverRequest(hoveredCountry, dateRange, true);
  }, [dateRangeKey, hoveredCountry, startHoverRequest, startThreatRequest]);

  useEffect(() => () => {
    hoverRequestTrackerRef.current.abort();
    threatRequestTrackerRef.current.abort();
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
