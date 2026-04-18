import type { ResilienceRankingItem } from '@/services/resilience';

/**
 * RGBA color tuples indexed by resilience level string.
 * Levels: "very low", "low", "medium", "high", "very high"
 */
export const RESILIENCE_CHOROPLETH_COLORS: Record<string, [number, number, number, number]> = {
  'very low':  [200, 50, 50, 180],
  'low':       [230, 140, 50, 180],
  'medium':    [230, 200, 50, 180],
  'high':      [100, 200, 80, 180],
  'very high': [50, 150, 220, 180],
};

export interface ChoroplethEntry {
  countryCode: string;
  overallScore: number;
  level: string;
  serverLevel: string;
  lowConfidence: boolean;
}

/**
 * Build a Map of countryCode -> ChoroplethEntry from resilience ranking items.
 */
export function buildResilienceChoroplethMap(
  items: ResilienceRankingItem[],
  greyedOut: ResilienceRankingItem[],
): Map<string, ChoroplethEntry> {
  const map = new Map<string, ChoroplethEntry>();

  for (const item of items) {
    map.set(item.countryCode, {
      countryCode: item.countryCode,
      overallScore: item.overallScore,
      level: item.level,
      serverLevel: item.level,
      lowConfidence: item.lowConfidence,
    });
  }

  for (const item of greyedOut) {
    if (!map.has(item.countryCode)) {
      map.set(item.countryCode, {
        countryCode: item.countryCode,
        overallScore: item.overallScore,
        level: item.level,
        serverLevel: item.level,
        lowConfidence: true,
      });
    }
  }

  return map;
}
