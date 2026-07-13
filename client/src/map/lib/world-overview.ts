import type { FeatureCollection, Geometry, Position } from 'geojson';

export type WorldOverviewBounds = [[number, number], [number, number]];

export const WORLD_SEAM_LONGITUDE = -169;
// Keep the rendered range infinitesimally below 360°. MapLibre wraps both
// endpoints of an exact 360° maxBounds range to the same x coordinate.
export const WORLD_EAST_LONGITUDE = WORLD_SEAM_LONGITUDE + 360 - 1e-7;
export const WORLD_CENTER_LONGITUDE = WORLD_SEAM_LONGITUDE + 180;
export const WORLD_OVERVIEW_PADDING = 24;

const HIDDEN_COUNTRY_CODES = new Set(['AQ']);

function visitPositions(geometry: Geometry, visit: (position: Position) => void): void {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((child) => visitPositions(child, visit));
    return;
  }

  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      visit(value as Position);
      return;
    }
    value.forEach(walk);
  };

  walk(geometry.coordinates);
}

export function calculateWorldOverviewBounds(
  geojson: FeatureCollection<Geometry>,
): WorldOverviewBounds | null {
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const feature of geojson.features) {
    const code = feature.properties?.['ISO3166-1-Alpha-2'];
    if (!feature.geometry || (typeof code === 'string' && HIDDEN_COUNTRY_CODES.has(code))) {
      continue;
    }

    visitPositions(feature.geometry, (position) => {
      const lon = Number(position[0]);
      const lat = Number(position[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  }

  return Number.isFinite(minLat)
    ? [[WORLD_SEAM_LONGITUDE, minLat], [WORLD_EAST_LONGITUDE, maxLat]]
    : null;
}

export function normalizeWorldLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) return longitude;
  return ((((longitude - WORLD_SEAM_LONGITUDE) % 360) + 360) % 360) + WORLD_SEAM_LONGITUDE;
}

export function normalizeWorldPosition(position: [number, number]): [number, number] {
  return [normalizeWorldLongitude(position[0]), position[1]];
}
