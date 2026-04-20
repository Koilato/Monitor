export interface TwoDMapConfig {
  centerLng: number;
  centerLat: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  contentPaddingX: number;
}

export const DEFAULT_TWO_D_MAP_CONFIG: TwoDMapConfig = {
  centerLng: 0,
  centerLat: 0,
  zoom: 0,
  minZoom: -2,
  maxZoom: 6,
  contentPaddingX: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeTwoDMapConfig(
  input: Partial<TwoDMapConfig>,
): TwoDMapConfig {
  const minZoom = Math.max(-2, input.minZoom ?? DEFAULT_TWO_D_MAP_CONFIG.minZoom);
  const maxZoom = Math.max(minZoom, input.maxZoom ?? DEFAULT_TWO_D_MAP_CONFIG.maxZoom);
  const zoom = clamp(input.zoom ?? DEFAULT_TWO_D_MAP_CONFIG.zoom, minZoom, maxZoom);

  return {
    centerLng: clamp(input.centerLng ?? DEFAULT_TWO_D_MAP_CONFIG.centerLng, -180, 180),
    centerLat: clamp(input.centerLat ?? DEFAULT_TWO_D_MAP_CONFIG.centerLat, -90, 90),
    zoom,
    minZoom,
    maxZoom,
    contentPaddingX: Math.max(0, input.contentPaddingX ?? DEFAULT_TWO_D_MAP_CONFIG.contentPaddingX),
  };
}
