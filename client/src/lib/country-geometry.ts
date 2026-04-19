import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, Position } from 'geojson';

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

const COUNTRY_GEOJSON_URL = '/data/countries.geojson';

let loadPromise: Promise<void> | null = null;
let countriesGeoJson: FeatureCollection<Geometry> | null = null;
let countryList: IndexedCountryGeometry[] = [];
const countriesByCode = new Map<string, IndexedCountryGeometry>();

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
  })();

  await loadPromise;
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
  await ensureLoaded();
  const country = countriesByCode.get(code.toUpperCase());
  if (!country) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = country.bbox;
  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
  };
}

export async function getCountryName(code: string): Promise<string | null> {
  await ensureLoaded();
  return countriesByCode.get(code.toUpperCase())?.name ?? null;
}

export async function getCountryFeatures(): Promise<Feature<Geometry>[]> {
  await ensureLoaded();
  return countryList.map((country) => country.feature);
}
