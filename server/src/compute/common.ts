import type {
  EventLevel,
  HoverFlow,
  ThreatCountryStat,
  ThreatIntelItem,
  ThreatSeverityCounts,
} from '../../../shared/types.js';

export const EVENT_LEVEL_PRIORITY: Record<EventLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const COUNTRY_LABELS: Record<string, string> = {
  AU: '澳大利亚',
  BE: '比利时',
  BR: '巴西',
  CA: '加拿大',
  CN: '中国',
  DE: '德国',
  DK: '丹麦',
  ES: '西班牙',
  FR: '法国',
  GB: '英国',
  IN: '印度',
  IT: '意大利',
  JP: '日本',
  KR: '韩国',
  NL: '荷兰',
  NO: '挪威',
  PL: '波兰',
  RU: '俄罗斯',
  SE: '瑞典',
  SG: '新加坡',
  TR: '土耳其',
  US: '美国',
};

export const SEVERITY_TO_THREAT_INTEL: Record<EventLevel, Pick<ThreatIntelItem, 'tone' | 'level'>> = {
  high: { tone: 'critical', level: '严重' },
  medium: { tone: 'warning', level: '警告' },
  low: { tone: 'info', level: '提示' },
};

export interface RangeWhereResult {
  sql: string;
  params: string[];
}

export function buildGeneratedAt(): string {
  return new Date().toISOString();
}

export function buildRangeWhere(startDate: string | null, endDate: string | null, columnName = 'occurred_date'): RangeWhereResult {
  const clauses: string[] = [];
  const params: string[] = [];

  if (startDate) {
    clauses.push(`${columnName} >= ?`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`${columnName} <= ?`);
    params.push(endDate);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

export function mapSeverityCounts(row: {
  low_count: number;
  medium_count: number;
  high_count: number;
}): ThreatSeverityCounts {
  return {
    low: row.low_count,
    medium: row.medium_count,
    high: row.high_count,
  };
}

export function getCountryLabel(countryCode: string): string {
  return COUNTRY_LABELS[countryCode] ?? countryCode;
}

export function compareThreatCountries(left: ThreatCountryStat, right: ThreatCountryStat): number {
  const levelPriorityDelta = EVENT_LEVEL_PRIORITY[right.eventLevel] - EVENT_LEVEL_PRIORITY[left.eventLevel];
  if (levelPriorityDelta !== 0) {
    return levelPriorityDelta;
  }
  if (right.incidentCount !== left.incidentCount) {
    return right.incidentCount - left.incidentCount;
  }
  return left.country.localeCompare(right.country);
}

export function compareFlows(left: HoverFlow, right: HoverFlow): number {
  if (right.count !== left.count) {
    return right.count - left.count;
  }
  const attackerDelta = left.attackerCountry.localeCompare(right.attackerCountry);
  if (attackerDelta !== 0) {
    return attackerDelta;
  }
  return left.victimCountry.localeCompare(right.victimCountry);
}
