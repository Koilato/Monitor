export interface ThreeDMapConfig {
  povLng: number;
  povLat: number;
  povAltitude: number;
}

export const DEFAULT_THREE_D_MAP_CONFIG: ThreeDMapConfig = {
  povLng: 105,
  povLat: 24,
  povAltitude: 2.45,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeThreeDMapConfig(
  input: Partial<ThreeDMapConfig>,
): ThreeDMapConfig {
  return {
    povLng: clamp(input.povLng ?? DEFAULT_THREE_D_MAP_CONFIG.povLng, -180, 180),
    povLat: clamp(input.povLat ?? DEFAULT_THREE_D_MAP_CONFIG.povLat, -90, 90),
    povAltitude: Math.max(0.2, input.povAltitude ?? DEFAULT_THREE_D_MAP_CONFIG.povAltitude),
  };
}
