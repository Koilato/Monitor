/**
 * Country centroid lookup.
 *
 * Delegates to `getCountryCentroid` from `country-geometry.ts` which computes
 * the centre of a country's bounding-box.  That function requires the GeoJSON
 * data to be loaded first (via `preloadCountryGeometry`), so callers that need
 * centroids before the map is ready should call `preloadCountryGeometry()`
 * early in the application lifecycle.
 */
import { getCountryCentroid as geoCentroid } from '@/services/country-geometry';

/** Fallback lat/lon for countries that may not be in the GeoJSON dataset. */
const FALLBACK_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  TW: { lat: 23.7, lon: 120.9 },
  XK: { lat: 42.6, lon: 20.9 },
};

/**
 * Return the centroid (lat, lon) for a given ISO-3166-1 alpha-2 country code.
 *
 * Tries the GeoJSON-based computation first, then falls back to a small
 * hard-coded table for territories that may be missing from the dataset.
 */
export function getCountryCentroid(code: string): { lat: number; lon: number } | null {
  const result = geoCentroid(code);
  if (result) return result;
  return FALLBACK_CENTROIDS[code] ?? null;
}
