import type { FeatureCollection, Geometry, Position } from 'geojson';

export type WorldOverviewBounds = [[number, number], [number, number]];

const HIDDEN_COUNTRY_CODES = new Set(['AQ']);
const MAX_MERCATOR_LATITUDE = 85.051129;
const VERTICAL_OVERVIEW_PADDING_RATIO = 0.92;

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
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
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
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    });
  }

  return Number.isFinite(minLon) ? [[minLon, minLat], [maxLon, maxLat]] : null;
}

function mercatorY(latitude: number): number {
  const lat = Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, latitude));
  const radians = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

export function getWorldOverviewAspectRatio(bounds: WorldOverviewBounds): number {
  const [[west, south], [east, north]] = bounds;
  const projectedWidth = Math.max((east - west) / 360, 0.01);
  const projectedHeight = Math.max(Math.abs(mercatorY(south) - mercatorY(north)), 0.01);
  // A slightly taller stage leaves vertical breathing room without asking
  // MapLibre to zoom beyond the single-world horizontal constraint.
  return projectedWidth / projectedHeight * VERTICAL_OVERVIEW_PADDING_RATIO;
}
