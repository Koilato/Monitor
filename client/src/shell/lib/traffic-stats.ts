import type { AllFlowResponse, ThreatMapResponse } from '@shared/types';
import { getChineseCountryName } from 'map/lib/country-names-zh';

export type TrafficStatTone = 'critical' | 'warning' | 'info' | 'neutral';

export interface TrafficStatItem {
  countryCode: string;
  countryName: string | null;
  volume: number;
  share: number;
  rank: number;
  tone: TrafficStatTone;
}

export interface TrafficStatsSummary {
  totalVolume: number;
  bars: TrafficStatItem[];
  origins: TrafficStatItem[];
}

export interface ThreatFrequencyTotals {
  high: number;
  medium: number;
  low: number;
}

interface BuildTrafficStatsOptions {
  barLimit?: number;
  listLimit?: number;
}

function resolveTone(rank: number): TrafficStatTone {
  if (rank === 1) {
    return 'critical';
  }

  if (rank === 2) {
    return 'warning';
  }

  if (rank === 3) {
    return 'info';
  }

  return 'neutral';
}

function compareTrafficStat(left: TrafficStatItem, right: TrafficStatItem): number {
  if (right.volume !== left.volume) {
    return right.volume - left.volume;
  }

  return left.countryCode.localeCompare(right.countryCode);
}

export function buildTrafficStats(
  data: AllFlowResponse | null,
  options: BuildTrafficStatsOptions = {},
): TrafficStatsSummary {
  const { barLimit = 10, listLimit = 3 } = options;
  const volumeByCountry = new Map<string, number>();

  for (const flow of data?.flows ?? []) {
    const code = flow.attackerCountry.trim().toUpperCase();
    if (!code) {
      continue;
    }

    volumeByCountry.set(code, (volumeByCountry.get(code) ?? 0) + flow.count);
  }

  const totalVolume = [...volumeByCountry.values()].reduce((sum, value) => sum + value, 0);
  const sorted = [...volumeByCountry.entries()]
    .map(([countryCode, volume], index) => ({
      countryCode,
      countryName: getChineseCountryName(countryCode),
      volume,
      share: totalVolume > 0 ? volume / totalVolume : 0,
      rank: index + 1,
      tone: 'neutral' as TrafficStatTone,
    }))
    .sort(compareTrafficStat)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      tone: resolveTone(index + 1),
    }));

  return {
    totalVolume,
    bars: sorted.slice(0, barLimit),
    origins: sorted.slice(0, listLimit),
  };
}

export function summarizeThreatFrequency(data: ThreatMapResponse | null): ThreatFrequencyTotals {
  return (data?.countries ?? []).reduce<ThreatFrequencyTotals>((totals, item) => ({
    high: totals.high + item.severityCounts.high,
    medium: totals.medium + item.severityCounts.medium,
    low: totals.low + item.severityCounts.low,
  }), {
    high: 0,
    medium: 0,
    low: 0,
  });
}
