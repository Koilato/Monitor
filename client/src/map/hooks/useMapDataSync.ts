import { useCallback, useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange, RansomwareKpiResponse, ThreatMapResponse, ThreatTrendResponse } from '@shared/types';
import { fetchAllFlows, fetchCountryHover, fetchRansomwareKpis, fetchThreatMap, fetchThreatTrend } from 'shared/api/client';
import { createRequestTracker } from 'map/lib/request-tracker';
import { timeFilterToDateRange, type TimeFilterState } from 'map/state/map-state';
import type { CountrySelectEvent, PopupAnchor, SelectedCountryState } from 'map/state/map-types';

export interface MapDataSyncState {
  dateRange: DateRange;
  selectedCountry: SelectedCountryState | null;
  selectedAnchor: PopupAnchor | null;
  countryData: CountryHoverResponse | null;
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
  handleCountrySelect: (event: CountrySelectEvent) => void;
}

interface UseMapDataSyncInput {
  timeFilter: TimeFilterState;
  showAttackArcs: boolean;
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
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountryState | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<PopupAnchor | null>(null);
  const [countryData, setCountryData] = useState<CountryHoverResponse | null>(null);
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
  const countryRequestTrackerRef = useRef(createRequestTracker());
  const threatRequestTrackerRef = useRef(createRequestTracker());
  const trendRequestTrackerRef = useRef(createRequestTracker());
  const allFlowRequestTrackerRef = useRef(createRequestTracker());
  const ransomwareKpisRequestTrackerRef = useRef(createRequestTracker());
  const activeCountryRef = useRef<string | null>(null);
  const activeRangeRef = useRef(serializeDateRange(dateRange));
  const latestRangeRef = useRef<DateRange>(dateRange);

  const startCountryRequest = useCallback(async (
    country: SelectedCountryState,
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
    const requestTicket = countryRequestTrackerRef.current.next();

    setCountryData(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetchCountryHover(country.code, range, requestTicket.signal);
      if (requestTicket.signal.aborted || !countryRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setCountryData(response);
    } catch (fetchError) {
      if (isAbortError(fetchError) || requestTicket.signal.aborted || !countryRequestTrackerRef.current.isCurrent(requestTicket.id)) {
        return;
      }
      setCountryData(null);
      setError((fetchError as Error).message);
    } finally {
      if (!requestTicket.signal.aborted && countryRequestTrackerRef.current.isCurrent(requestTicket.id)) {
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

  const clearSelectedCountry = useCallback(() => {
    activeCountryRef.current = null;
    activeRangeRef.current = serializeDateRange(latestRangeRef.current);
    countryRequestTrackerRef.current.abort();
    setSelectedCountry(null);
    setSelectedAnchor(null);
    setCountryData(null);
    setLoading(false);
    setError(null);
  }, []);

  const handleCountrySelect = useCallback((event: CountrySelectEvent) => {
    if (!event.country) {
      clearSelectedCountry();
      return;
    }

    if (selectedCountry?.code === event.country.code) {
      clearSelectedCountry();
      return;
    }

    setSelectedAnchor(event.anchor);
    setSelectedCountry(event.country);
    void startCountryRequest(event.country, latestRangeRef.current);
  }, [clearSelectedCountry, selectedCountry, startCountryRequest]);

  useEffect(() => {
    latestRangeRef.current = dateRange;
    void startThreatRequest(dateRange);
    void startAllFlowRequest(dateRange);
    void startTrendRequest(dateRange);
    void startRansomwareKpisRequest(dateRange);
    if (!selectedCountry || dateRangeKey === activeRangeRef.current) {
      return;
    }

    void startCountryRequest(selectedCountry, dateRange, true);
  }, [dateRangeKey, selectedCountry, startCountryRequest, startThreatRequest, startAllFlowRequest, startTrendRequest, startRansomwareKpisRequest]);

  useEffect(() => () => {
    countryRequestTrackerRef.current.abort();
    threatRequestTrackerRef.current.abort();
    trendRequestTrackerRef.current.abort();
    allFlowRequestTrackerRef.current.abort();
    ransomwareKpisRequestTrackerRef.current.abort();
  }, []);

  const panelCount = selectedCountry
    ? countryData?.total ?? 0
    : allFlowData?.total ?? 0;
  const statusTone = error || threatError || trendError || ransomwareKpisError || allFlowError
    ? 'error'
    : loading || threatLoading || trendLoading || ransomwareKpisLoading || allFlowLoading
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
      : allFlowError
        ? '流量错误'
      : loading
        ? '查询中'
      : threatLoading
        ? '筛选地图中'
        : trendLoading
          ? '趋势统计中'
        : ransomwareKpisLoading
          ? '指标统计中'
          : allFlowLoading
            ? '正在准备全部流量'
            : selectedCountry
              ? `追踪 ${selectedCountry.code}`
              : input.showAttackArcs
              ? `全部流量 ${allFlowData?.total ?? 0}`
              : '实时地图信息流';

  return {
    dateRange,
    selectedCountry,
    selectedAnchor,
    countryData,
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
    handleCountrySelect,
  };
}
