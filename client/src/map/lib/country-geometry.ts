import polylabel from '@mapbox/polylabel';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, Position } from 'geojson';
import { COUNTRY_CENTERS, type CountryCenterPoint } from 'map/lib/country-centers';

interface IndexedCountryGeometry {
  code: string;
  name: string;
  bbox: [number, number, number, number];
  polygons: [number, number][][][];
  feature: Feature<Geometry>;
}

interface CountryHit {
  code: string;
  name: string;
}

interface CountryPoint {
  lat: number;
  lon: number;
}

interface InteriorPointCandidate {
  point: CountryPoint;
  score: number;
}

const COUNTRY_GEOJSON_URL = '/data/countries.geojson';
const COUNTRY_INTERIOR_POINT_PRECISION = 0.25;

let loadPromise: Promise<void> | null = null;
let countriesGeoJson: FeatureCollection<Geometry> | null = null;
let countryList: IndexedCountryGeometry[] = [];
const countriesByCode = new Map<string, IndexedCountryGeometry>();
const countryInteriorPointCache = new Map<string, CountryPoint | null>();
const countryCenterOverrides = new Map<string, CountryPoint>();

function normalizeCode(properties: GeoJsonProperties | null | undefined): string | null {
  const raw = properties?.['ISO3166-1-Alpha-2'] ?? properties?.ISO_A2 ?? properties?.iso_a2;
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function normalizeName(properties: GeoJsonProperties | null | undefined): string | null {
  const raw = properties?.name ?? properties?.NAME ?? properties?.admin;
  const name = typeof raw === 'string' ? raw.trim() : '';
  return name.length > 0 ? name : null;
}

function toCoord(point: Position): [number, number] | null {
  if (!Array.isArray(point) || point.length < 2) {
    return null;
  }

  const lon = Number(point[0]);
  const lat = Number(point[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return [lon, lat];
}

function normalizeRings(rings: Position[][]): [number, number][][] {
  return rings
    .map((ring) => ring.map(toCoord).filter((point): point is [number, number] => point !== null))
    .filter((ring) => ring.length >= 3);
}

function normalizeGeometry(geometry: Geometry | null | undefined): [number, number][][][] {
  if (!geometry) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    const polygon = normalizeRings(geometry.coordinates);
    return polygon.length > 0 ? [polygon] : [];
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => normalizeRings(polygon))
      .filter((polygon) => polygon.length > 0);
  }

  return [];
}

function computeBbox(polygons: [number, number][][][]): [number, number, number, number] | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let hasPoint = false;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        hasPoint = true;
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return hasPoint ? [minLon, minLat, maxLon, maxLat] : null;
}

function computeRingArea(ring: [number, number][]): number {
  if (ring.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) {
      continue;
    }

    area += (current[0] * next[1]) - (next[0] * current[1]);
  }

  return area / 2;
}

function computeRingCentroid(ring: [number, number][]): { lon: number; lat: number } | null {
  const area = computeRingArea(ring);
  if (!Number.isFinite(area) || Math.abs(area) < 1e-9) {
    return null;
  }

  let lon = 0;
  let lat = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) {
      continue;
    }

    const cross = (current[0] * next[1]) - (next[0] * current[1]);
    lon += (current[0] + next[0]) * cross;
    lat += (current[1] + next[1]) * cross;
  }

  const factor = 1 / (6 * area);
  const centroidLon = lon * factor;
  const centroidLat = lat * factor;

  return Number.isFinite(centroidLon) && Number.isFinite(centroidLat)
    ? { lon: centroidLon, lat: centroidLat }
    : null;
}

function distanceSquaredToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const offsetX = px - x1;
    const offsetY = py - y1;
    return (offsetX * offsetX) + (offsetY * offsetY);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / ((dx * dx) + (dy * dy));

  let closestX = x1;
  let closestY = y1;
  if (t >= 1) {
    closestX = x2;
    closestY = y2;
  } else if (t > 0) {
    closestX = x1 + (dx * t);
    closestY = y1 + (dy * t);
  }

  const offsetX = px - closestX;
  const offsetY = py - closestY;
  return (offsetX * offsetX) + (offsetY * offsetY);
}

function distanceToRingOutlineSquared(point: [number, number], ring: [number, number][]): number {
  let minDistance = Infinity;

  for (let index = 1; index < ring.length; index += 1) {
    const previous = ring[index - 1];
    const current = ring[index];
    if (!previous || !current) {
      continue;
    }

    const distance = distanceSquaredToSegment(point[0], point[1], previous[0], previous[1], current[0], current[1]);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

function getPolygonInteriorCandidate(polygon: [number, number][][]): InteriorPointCandidate | null {
  const outerRing = polygon[0];
  if (!outerRing || outerRing.length < 3) {
    return null;
  }

  try {
    const [lon, lat] = polylabel(polygon, COUNTRY_INTERIOR_POINT_PRECISION);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null;
    }

    let minDistanceSquared = Infinity;
    for (const ring of polygon) {
      const ringDistance = distanceToRingOutlineSquared([lon, lat], ring);
      if (ringDistance < minDistanceSquared) {
        minDistanceSquared = ringDistance;
      }
    }

    if (!Number.isFinite(minDistanceSquared)) {
      return null;
    }

    return {
      point: { lon, lat },
      score: Math.sqrt(minDistanceSquared),
    };
  } catch {
    return null;
  }
}

function getCountryFallbackPoint(country: IndexedCountryGeometry): CountryPoint | null {
  const outerRing = getLargestPolygonOuterRing(country);
  if (outerRing) {
    const centroid = computeRingCentroid(outerRing);
    if (centroid) {
      return { lat: centroid.lat, lon: centroid.lon };
    }

    const bbox = computeRingBbox(outerRing);
    if (bbox) {
      return {
        lat: (bbox[1] + bbox[3]) / 2,
        lon: (bbox[0] + bbox[2]) / 2,
      };
    }
  }

  const bbox = computeBbox(country.polygons);
  if (!bbox) {
    return null;
  }

  return {
    lat: (bbox[1] + bbox[3]) / 2,
    lon: (bbox[0] + bbox[2]) / 2,
  };
}

function resolveCountryInteriorPoint(country: IndexedCountryGeometry): CountryPoint | null {
  let bestCandidate: InteriorPointCandidate | null = null;

  for (const polygon of country.polygons) {
    const candidate = getPolygonInteriorCandidate(polygon);
    if (!candidate) {
      continue;
    }

    if (!bestCandidate || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate?.point ?? getCountryFallbackPoint(country);
}

function computeRingBbox(ring: [number, number][]): [number, number, number, number] | null {
  return computeBbox([[ring]]);
}

function getLargestPolygonOuterRing(country: IndexedCountryGeometry): [number, number][] | null {
  let largestRing: [number, number][] | null = null;
  let largestArea = -Infinity;

  for (const polygon of country.polygons) {
    const outerRing = polygon[0];
    if (!outerRing) {
      continue;
    }

    const area = Math.abs(computeRingArea(outerRing));
    if (area > largestArea) {
      largestArea = area;
      largestRing = outerRing;
    }
  }

  return largestRing;
}

function pointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-9) {
    return false;
  }

  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= 0;
}

function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) {
      continue;
    }

    const [xi, yi] = current;
    const [xj, yj] = previous;

    if (pointOnSegment(lon, lat, xi, yi, xj, yj)) {
      return true;
    }

    const intersects = ((yi > lat) !== (yj > lat))
      && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInCountry(country: IndexedCountryGeometry, lat: number, lon: number): boolean {
  const [minLon, minLat, maxLon, maxLat] = country.bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
    return false;
  }

  for (const polygon of country.polygons) {
    const outer = polygon[0];
    if (!outer || !pointInRing(lon, lat, outer)) {
      continue;
    }

    let inHole = false;
    for (let index = 1; index < polygon.length; index += 1) {
      const hole = polygon[index];
      if (hole && pointInRing(lon, lat, hole)) {
        inHole = true;
        break;
      }
    }

    if (!inHole) {
      return true;
    }
  }

  return false;
}

async function ensureLoaded(): Promise<void> {
  if (countriesGeoJson || loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    const response = await fetch(COUNTRY_GEOJSON_URL);
    if (!response.ok) {
      throw new Error(`Failed to load countries geojson: ${response.status}`);
    }

    const geojson = await response.json() as FeatureCollection<Geometry>;
    countriesGeoJson = geojson;

    const indexedCountries: IndexedCountryGeometry[] = [];

    for (const feature of geojson.features) {
      const code = normalizeCode(feature.properties);
      const name = normalizeName(feature.properties);
      if (!code || !name) {
        continue;
      }

      const polygons = normalizeGeometry(feature.geometry);
      const bbox = computeBbox(polygons);
      if (!bbox || polygons.length === 0) {
        continue;
      }

      const indexed: IndexedCountryGeometry = {
        code,
        name,
        bbox,
        polygons,
        feature,
      };

      indexedCountries.push(indexed);
      countriesByCode.set(code, indexed);
    }

    countryList = indexedCountries;
    countriesGeoJson = geojson;
  })();

  await loadPromise;
}

function cloneCountryPoint(point: CountryPoint | CountryCenterPoint): CountryPoint {
  return {
    lon: point.lon,
    lat: point.lat,
  };
}

export function setCountryCenterOverrides(overrides: Record<string, CountryCenterPoint>): void {
  countryCenterOverrides.clear();

  for (const [code, point] of Object.entries(overrides)) {
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCode)) {
      continue;
    }

    if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)) {
      continue;
    }

    countryCenterOverrides.set(normalizedCode, cloneCountryPoint(point));
  }
}

export function getCountryCenterOverride(code: string): CountryPoint | null {
  const normalizedCode = code.trim().toUpperCase();
  const override = countryCenterOverrides.get(normalizedCode);
  return override ? cloneCountryPoint(override) : null;
}

export function getStaticCountryCenter(code: string): CountryPoint | null {
  const normalizedCode = code.trim().toUpperCase();
  const point = COUNTRY_CENTERS[normalizedCode];
  return point ? cloneCountryPoint(point) : null;
}

export function getCountryCenterSource(code: string): 'override' | 'preset' | 'computed' | 'missing' {
  const normalizedCode = code.trim().toUpperCase();
  if (countryCenterOverrides.has(normalizedCode)) {
    return 'override';
  }

  if (COUNTRY_CENTERS[normalizedCode]) {
    return 'preset';
  }

  if (countryInteriorPointCache.has(normalizedCode)) {
    return countryInteriorPointCache.get(normalizedCode) ? 'computed' : 'missing';
  }

  return 'missing';
}

export async function getCountriesGeoJson(): Promise<FeatureCollection<Geometry>> {
  await ensureLoaded();
  if (!countriesGeoJson) {
    throw new Error('Countries geojson unavailable');
  }
  return countriesGeoJson;
}

export async function getCountryAtCoordinates(lat: number, lon: number): Promise<CountryHit | null> {
  await ensureLoaded();

  for (const country of countryList) {
    if (pointInCountry(country, lat, lon)) {
      return { code: country.code, name: country.name };
    }
  }

  return null;
}

export async function getCountryCentroid(code: string): Promise<{ lat: number; lon: number } | null> {
  const normalizedCode = code.toUpperCase();
  const override = countryCenterOverrides.get(normalizedCode);
  if (override) {
    return cloneCountryPoint(override);
  }

  const preset = COUNTRY_CENTERS[normalizedCode];
  if (preset) {
    return cloneCountryPoint(preset);
  }

  await ensureLoaded();
  if (countryInteriorPointCache.has(normalizedCode)) {
    return countryInteriorPointCache.get(normalizedCode) ?? null;
  }

  const country = countriesByCode.get(normalizedCode);
  if (!country) {
    countryInteriorPointCache.set(normalizedCode, null);
    return null;
  }

  const point = resolveCountryInteriorPoint(country);
  countryInteriorPointCache.set(normalizedCode, point);
  return point;
}

export async function getCountryLabelAnchor(code: string): Promise<{ lat: number; lon: number } | null> {
  return getCountryCentroid(code);
}

export async function getCountryName(code: string): Promise<string | null> {
  await ensureLoaded();
  return countriesByCode.get(code.toUpperCase())?.name ?? null;
}

export async function getCountryFeatures(): Promise<Feature<Geometry>[]> {
  await ensureLoaded();
  return countryList.map((country) => country.feature);
}
