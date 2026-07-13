import type {
  AllFlowResponse,
  CountryHoverResponse,
  DateRange,
  RansomwareKpiResponse,
  ThreatIntelResponse,
  ThreatIntelSortOrder,
  ThreatMapResponse,
  ThreatTrendResponse,
} from '@shared/types';

const API_BASE_URL = (import.meta as ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
}).env?.VITE_API_BASE_URL ?? 'http://localhost:8787';
const API_RESPONSE_CACHE_TTL_MS = 5000;

interface CachedApiResponse {
  expiresAt: number;
  value: unknown;
}

const apiResponseCache = new Map<string, CachedApiResponse>();
const inflightApiRequests = new Map<string, Promise<unknown>>();

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

async function parseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
  const message = typeof payload?.error === 'string'
    ? payload.error
    : payload?.error?.message ?? response.statusText;
  return new Error(message || '请求失败');
}

async function fetchJsonCached<T>(url: string, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);

  const now = performance.now();
  const cached = apiResponseCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  let request = inflightApiRequests.get(url);
  if (!request) {
    request = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw await parseError(response);
        }
        const payload = await response.json() as T;
        apiResponseCache.set(url, {
          expiresAt: performance.now() + API_RESPONSE_CACHE_TTL_MS,
          value: payload,
        });
        return payload;
      })
      .finally(() => {
        inflightApiRequests.delete(url);
      });
    inflightApiRequests.set(url, request);
  }

  const payload = await request;
  throwIfAborted(signal);
  return payload as T;
}

export function buildCountryHoverUrl(victimCountry: string, range: DateRange): string {
  const url = new URL(`/api/v1/map/countries/${victimCountry}`, API_BASE_URL);
  if (range.startDate) {
    url.searchParams.set('startDate', range.startDate);
  }
  if (range.endDate) {
    url.searchParams.set('endDate', range.endDate);
  }
  return url.toString();
}

export async function fetchCountryHover(
  victimCountry: string,
  range: DateRange,
  signal?: AbortSignal,
): Promise<CountryHoverResponse> {
  return fetchJsonCached<CountryHoverResponse>(buildCountryHoverUrl(victimCountry, range), signal);
}

export function buildAllFlowsUrl(range: DateRange): string {
  const url = new URL('/api/v1/map/flows', API_BASE_URL);
  if (range.startDate) {
    url.searchParams.set('startDate', range.startDate);
  }
  if (range.endDate) {
    url.searchParams.set('endDate', range.endDate);
  }
  return url.toString();
}

export async function fetchAllFlows(
  range: DateRange,
  signal?: AbortSignal,
): Promise<AllFlowResponse> {
  return fetchJsonCached<AllFlowResponse>(buildAllFlowsUrl(range), signal);
}

export function buildThreatMapUrl(range: DateRange): string {
  const url = new URL('/api/v1/map/summary', API_BASE_URL);
  if (range.startDate) {
    url.searchParams.set('startDate', range.startDate);
  }
  if (range.endDate) {
    url.searchParams.set('endDate', range.endDate);
  }
  return url.toString();
}

export async function fetchThreatMap(
  range: DateRange,
  signal?: AbortSignal,
): Promise<ThreatMapResponse> {
  return fetchJsonCached<ThreatMapResponse>(buildThreatMapUrl(range), signal);
}

export function buildThreatTrendUrl(range: DateRange): string {
  const url = new URL('/api/v1/map/trends', API_BASE_URL);
  if (range.startDate) {
    url.searchParams.set('startDate', range.startDate);
  }
  if (range.endDate) {
    url.searchParams.set('endDate', range.endDate);
  }
  return url.toString();
}

export async function fetchThreatTrend(
  range: DateRange,
  signal?: AbortSignal,
): Promise<ThreatTrendResponse> {
  return fetchJsonCached<ThreatTrendResponse>(buildThreatTrendUrl(range), signal);
}

export function buildRansomwareKpisUrl(range: DateRange): string {
  const url = new URL('/api/v1/map/ransomware-kpis', API_BASE_URL);
  if (range.startDate) {
    url.searchParams.set('startDate', range.startDate);
  }
  if (range.endDate) {
    url.searchParams.set('endDate', range.endDate);
  }
  return url.toString();
}

export async function fetchRansomwareKpis(
  range: DateRange,
  signal?: AbortSignal,
): Promise<RansomwareKpiResponse> {
  return fetchJsonCached<RansomwareKpiResponse>(buildRansomwareKpisUrl(range), signal);
}

export function buildThreatIntelUrl(
  sort: ThreatIntelSortOrder,
  limit: number,
  offset = 0,
): string {
  const url = new URL('/api/v1/intel/feed', API_BASE_URL);
  url.searchParams.set('sort', sort);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

export async function fetchThreatIntel(
  sort: ThreatIntelSortOrder,
  limit: number,
  offset = 0,
  signal?: AbortSignal,
): Promise<ThreatIntelResponse> {
  return fetchJsonCached<ThreatIntelResponse>(buildThreatIntelUrl(sort, limit, offset), signal);
}
