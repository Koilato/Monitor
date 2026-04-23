import type {
  CountryHoverResponse,
  DateRange,
  LatestContentResponse,
  ThreatMapResponse,
} from '@shared/types';

const API_BASE_URL = (import.meta as ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
}).env?.VITE_API_BASE_URL ?? 'http://localhost:8787';

export function buildCountryHoverUrl(victimCountry: string, range: DateRange): string {
  const url = new URL('/api/map/country-hover', API_BASE_URL);
  url.searchParams.set('victimCountry', victimCountry);
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
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json() as Promise<CountryHoverResponse>;
}

export function buildLatestContentUrl(
  category: string,
  limit: number,
  offset = 0,
): string {
  const url = new URL('/api/content/latest', API_BASE_URL);
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
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json() as Promise<LatestContentResponse>;
}

export function buildThreatMapUrl(range: DateRange): string {
  const url = new URL('/api/map/threat-map', API_BASE_URL);
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
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json() as Promise<ThreatMapResponse>;
}
