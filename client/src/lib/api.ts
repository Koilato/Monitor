import type { CountryHoverResponse, DateRange } from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

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
