import { useCallback, useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange, RansomwareKpiResponse, ThreatMapResponse, ThreatTrendResponse } from '@shared/types';
import { fetchAllFlows, fetchCountryHover, fetchRansomwareKpis, fetchThreatMap, fetchThreatTrend } from 'shared/api/client';
import { createRequestTracker } from 'map/lib/request-tracker';
import { timeFilterToDateRange, type TimeFilterState } from 'map/state/map-state';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from 'map/state/map-types';
import type { FlowMode } from 'map/state/map-state';

export interface MapDataSyncState {
  dateRange: DateRange;
  hoveredCountry: HoverCountryState | null;
  popupAnchor: PopupAnchor | null;
  hoverData: CountryHoverResponse | null;
  allFlowData: Awaited<ReturnType<typeof fetchAllFlows>> | null;
  threatData: ThreatMapResponse | null;
  trendData: ThreatTrendResponse | null;
  ransomwareKpis: RansomwareKpiResponse | null;
  loading: boolean;
  threatLoading: boolean;
  trendLoading: boolean;
  allFlowLoading: boolean;
  ransomwareKpisLoading: boolean;
  error: string | null;
  threatError: string | null;
  trendError: string | null;
  allFlowError: string | null;
  ransomwareKpisError: string | null;
  panelCount: number;
  statusTone: 'error' | 'warning' | 'live';
  statusLabel: string;
  handleCountryHover: (event: CountryHoverEvent) => void;
}

interface UseMapDataSyncInput {
  timeFilter: TimeFilterState;
  flowMode: FlowMode;
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
  const [allFlowData, setAllFlowData] = useState<Awaited<ReturnType<typeof fetchAllFlows>> | null>(null);
  const [threatData, setThreatData] = useState<ThreatMapResponse | null>(null);
  const [trendData, setTrendData] = useState<ThreatTrendResponse | null>(null);
  const [ransomwareKpis, setRansomwareKpis] = useState<RansomwareKpiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [threatLoading, setThreatLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [allFlowLoading, setAllFlowLoading] = useState(false);
  const [ransomwareKpisLoading, setRansomwareKpisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threatError, setThreatError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [allFlowError, setAllFlowError] = useState<string | null>(null);
  const [ransomwareKpisError, setRansomwareKpisError] = useState<string | null>(null);
  const hoverRequestTrackerRef = useRef(createRequestTracker());
  const threatRequestTrackerRef = useRef(createRequestTracker());
  const trendRequestTrackerRef = useRef(createRequestTracker());
  const allFlowRequestTrackerRef = useRef(createRequestTracker());
  const ransomwareKpisRequestTrackerRef = useRef(createRequestTracker());
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

  const startAllFlowRequest = useCallback(async (range: DateRange) => {
    const requestTicket = allFlowRequestTrackerRef.current.next();

    setAllFlowLoading(true);
    setAllFlowError(null);

    try {
      const response = await fetchAllFlows(range, requestTicket.signal);
      if (requestTicket.signal.aborted || !allFlowRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setAllFlowData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !allFlowRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setAllFlowData(null);
      setAllFlowError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && allFlowRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        setAllFlowLoading(false);
      }
    }
  }, []);

  const startTrendRequest = useCallback(async (range: DateRange) => {
    const requestTicket = trendRequestTrackerRef.current.next();

    setTrendLoading(true);
    setTrendError(null);

    try {
      const response = await fetchThreatTrend(range, requestTicket.signal);
      if (requestTicket.signal.aborted || !trendRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setTrendData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !trendRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setTrendData(null);
      setTrendError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && trendRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        setTrendLoading(false);
      }
    }
  }, []);

  const startRansomwareKpisRequest = useCallback(async (range: DateRange) => {
    const requestTicket = ransomwareKpisRequestTrackerRef.current.next();

    setRansomwareKpisLoading(true);
    setRansomwareKpisError(null);

    try {
      const response = await fetchRansomwareKpis(range, requestTicket.signal);
      if (requestTicket.signal.aborted || !ransomwareKpisRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setRansomwareKpis(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !ransomwareKpisRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setRansomwareKpis(null);
      setRansomwareKpisError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && ransomwareKpisRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        setRansomwareKpisLoading(false);
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
    void startAllFlowRequest(dateRange);
    void startTrendRequest(dateRange);
    void startRansomwareKpisRequest(dateRange);
    if (!hoveredCountry || dateRangeKey === activeRangeRef.current) {
      return;
    }

    void startHoverRequest(hoveredCountry, dateRange, true);
  }, [dateRangeKey, hoveredCountry, input.flowMode, startHoverRequest, startThreatRequest, startAllFlowRequest, startTrendRequest, startRansomwareKpisRequest]);

  useEffect(() => () => {
    hoverRequestTrackerRef.current.abort();
    threatRequestTrackerRef.current.abort();
    trendRequestTrackerRef.current.abort();
    allFlowRequestTrackerRef.current.abort();
    ransomwareKpisRequestTrackerRef.current.abort();
  }, []);

  const panelCount = input.flowMode === 'allflow'
    ? allFlowData?.total ?? 0
    : hoveredCountry
      ? hoverData?.total ?? 0
      : 0;
  const statusTone = error || threatError || trendError || ransomwareKpisError || (input.flowMode === 'allflow' && allFlowError)
    ? 'error'
    : loading || threatLoading || trendLoading || ransomwareKpisLoading || (input.flowMode === 'allflow' && allFlowLoading)
      ? 'warning'
      : 'live';
  const statusLabel = error
    ? '查询错误'
    : threatError
      ? '地图错误'
      : trendError
        ? '趋势错误'
      : ransomwareKpisError
        ? '指标错误'
      : input.flowMode === 'allflow' && allFlowError
        ? '流量错误'
      : loading
        ? '查询中'
      : threatLoading
        ? '筛选地图中'
        : trendLoading
          ? '趋势统计中'
        : ransomwareKpisLoading
          ? '指标统计中'
          : input.flowMode === 'allflow' && allFlowLoading
            ? '正在准备全部流量'
            : input.flowMode === 'allflow'
              ? `全部流量 ${allFlowData?.total ?? 0}`
              : hoveredCountry
            ? `追踪 ${hoveredCountry.code}`
            : '实时地图信息流';

  return {
    dateRange,
    hoveredCountry,
    popupAnchor,
    hoverData,
    allFlowData,
    threatData,
    trendData,
    ransomwareKpis,
    loading,
    threatLoading,
    trendLoading,
    allFlowLoading,
    ransomwareKpisLoading,
    error,
    threatError,
    trendError,
    allFlowError,
    ransomwareKpisError,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  };
}
