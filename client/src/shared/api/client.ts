import type {
  AllFlowResponse,
  CountryHoverResponse,
  DateRange,
  LatestContentResponse,
  ThreatIntelResponse,
  ThreatIntelSortOrder,
  ThreatMapResponse,
} from '@shared/types';

const API_BASE_URL = (import.meta as ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
}).env?.VITE_API_BASE_URL ?? 'http://localhost:8787';

async function parseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
  const message = typeof payload?.error === 'string'
    ? payload.error
    : payload?.error?.message ?? response.statusText;
  return new Error(message || '请求失败');
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
  const response = await fetch(buildCountryHoverUrl(victimCountry, range), { signal });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<CountryHoverResponse>;
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
  const response = await fetch(buildAllFlowsUrl(range), { signal });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<AllFlowResponse>;
}

export function buildLatestContentUrl(
  category: string,
  limit: number,
  offset = 0,
): string {
  const url = new URL('/api/v1/content/feed', API_BASE_URL);
  url.searchParams.set('category', category);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

export async function fetchLatestContent(
  category: string,
  limit: number,
  offset = 0,
  signal?: AbortSignal,
): Promise<LatestContentResponse> {
  const response = await fetch(buildLatestContentUrl(category, limit, offset), { signal });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<LatestContentResponse>;
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
  const response = await fetch(buildThreatMapUrl(range), { signal });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<ThreatMapResponse>;
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
  const response = await fetch(buildThreatIntelUrl(sort, limit, offset), { signal });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<ThreatIntelResponse>;
}
