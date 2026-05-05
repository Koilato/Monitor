import type {
  AllFlowResponse,
  CountryHoverQuery,
  CountryHoverResponse,
  EventLevel,
  HoverFlow,
  HoverIncident,
  LatestContentQuery,
  LatestContentResponse,
  ThreatCountryStat,
  ThreatIntelItem,
  ThreatIntelQuery,
  ThreatIntelResponse,
  ThreatMapQuery,
  ThreatMapResponse,
  ThreatSeverityCounts,
} from '../../../shared/types.js';
import type { StorageRepository } from '../storage/repository.js';

const EVENT_LEVEL_PRIORITY: Record<EventLevel, number> = {
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

const SEVERITY_TO_THREAT_INTEL: Record<EventLevel, Pick<ThreatIntelItem, 'tone' | 'level'>> = {
  high: { tone: 'critical', level: '严重' },
  medium: { tone: 'warning', level: '警告' },
  low: { tone: 'info', level: '提示' },
};

interface RangeWhereResult {
  sql: string;
  params: string[];
}

function buildGeneratedAt(): string {
  return new Date().toISOString();
}

function buildRangeWhere(startDate: string | null, endDate: string | null, columnName = 'occurred_date'): RangeWhereResult {
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

function mapSeverityCounts(row: {
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

function getCountryLabel(countryCode: string): string {
  return COUNTRY_LABELS[countryCode] ?? countryCode;
}

function compareThreatCountries(left: ThreatCountryStat, right: ThreatCountryStat): number {
  const levelPriorityDelta = EVENT_LEVEL_PRIORITY[right.eventLevel] - EVENT_LEVEL_PRIORITY[left.eventLevel];
  if (levelPriorityDelta !== 0) {
    return levelPriorityDelta;
  }
  if (right.incidentCount !== left.incidentCount) {
    return right.incidentCount - left.incidentCount;
  }
  return left.country.localeCompare(right.country);
}

function compareFlows(left: HoverFlow, right: HoverFlow): number {
  if (right.count !== left.count) {
    return right.count - left.count;
  }
  const attackerDelta = left.attackerCountry.localeCompare(right.attackerCountry);
  if (attackerDelta !== 0) {
    return attackerDelta;
  }
  return left.victimCountry.localeCompare(right.victimCountry);
}

export function createComputeService(repository: StorageRepository) {
  return {
    getThreatIntelFeed(query: ThreatIntelQuery): ThreatIntelResponse {
      const clauses: string[] = [];
      const params: string[] = [];

      if (query.startDate) {
        clauses.push('occurred_date >= ?');
        params.push(query.startDate);
      }
      if (query.endDate) {
        clauses.push('occurred_date <= ?');
        params.push(query.endDate);
      }
      if (query.severity) {
        clauses.push('severity = ?');
        params.push(query.severity);
      }
      if (query.victimCountry) {
        clauses.push('victim_country = ?');
        params.push(query.victimCountry);
      }
      if (query.attackerCountry) {
        clauses.push('attacker_country = ?');
        params.push(query.attackerCountry);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const orderClause = query.sort === 'asc'
        ? 'ORDER BY occurred_at ASC, id ASC'
        : 'ORDER BY occurred_at DESC, id DESC';
      const rows = repository.all<{
        id: string;
        occurred_at: string;
        attacker_country: string;
        victim_country: string;
        severity: EventLevel;
        title: string;
        source_label: string;
        source_address: string;
      }>(
        `SELECT
          id,
          occurred_at,
          attacker_country,
          victim_country,
          severity,
          title,
          source_label,
          source_address
        FROM incidents
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?`,
        [...params, String(query.limit), String(query.offset)],
      );
      const totalRow = repository.get<{ total: number }>(
        `SELECT COUNT(*) AS total FROM incidents ${whereClause}`,
        params,
      );

      return {
        sort: query.sort,
        total: totalRow?.total ?? 0,
        limit: query.limit,
        offset: query.offset,
        generatedAt: buildGeneratedAt(),
        items: rows.map((row) => ({
          id: row.id,
          ...SEVERITY_TO_THREAT_INTEL[row.severity],
          severity: row.severity,
          victim: row.title,
          attacker: getCountryLabel(row.attacker_country),
          source: row.source_address,
          address: getCountryLabel(row.victim_country),
          attackerCountry: row.attacker_country,
          victimCountry: row.victim_country,
          occurredAt: row.occurred_at,
        })),
      };
    },

    getThreatMapSummary(query: ThreatMapQuery): ThreatMapResponse {
      const range = buildRangeWhere(query.startDate, query.endDate);
      const rows = repository.all<{
        country: string;
        incident_count: number;
        low_count: number;
        medium_count: number;
        high_count: number;
        event_level: EventLevel;
      }>(
        `SELECT
          victim_country AS country,
          SUM(incident_count) AS incident_count,
          SUM(low_count) AS low_count,
          SUM(medium_count) AS medium_count,
          SUM(high_count) AS high_count,
          CASE
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 3 THEN 'high'
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 2 THEN 'medium'
            ELSE 'low'
          END AS event_level
        FROM country_daily_stats
        ${range.sql}
        GROUP BY victim_country`,
        range.params,
      );

      const countries = rows.map((row) => ({
        country: row.country,
        incidentCount: row.incident_count,
        severityCounts: mapSeverityCounts(row),
        eventLevel: row.event_level,
      })).sort(compareThreatCountries);

      const totalIncidents = countries.reduce((sum, country) => sum + country.incidentCount, 0);

      return {
        startDate: query.startDate,
        endDate: query.endDate,
        total: totalIncidents,
        totalIncidents,
        countries,
        generatedAt: buildGeneratedAt(),
      };
    },

    getCountryHoverDetail(query: CountryHoverQuery): CountryHoverResponse {
      const params: string[] = [query.victimCountry];
      const clauses = ['victim_country = ?'];
      if (query.startDate) {
        clauses.push('occurred_date >= ?');
        params.push(query.startDate);
      }
      if (query.endDate) {
        clauses.push('occurred_date <= ?');
        params.push(query.endDate);
      }
      const whereClause = `WHERE ${clauses.join(' AND ')}`;

      const incidentRows = repository.all<{
        id: string;
        occurred_at: string;
        occurred_date: string;
        attacker_country: string;
        victim_country: string;
        severity: EventLevel;
        title: string;
        summary: string;
        source_label: string;
        source_address: string;
      }>(
        `SELECT
          id,
          occurred_at,
          occurred_date,
          attacker_country,
          victim_country,
          severity,
          title,
          summary,
          source_label,
          source_address
        FROM incidents
        ${whereClause}
        ORDER BY occurred_at DESC, id DESC`,
        params,
      );

      const flowRows = repository.all<{
        attacker_country: string;
        victim_country: string;
        incident_count: number;
        first_date: string;
        last_date: string;
      }>(
        `SELECT
          attacker_country,
          victim_country,
          SUM(incident_count) AS incident_count,
          MIN(first_date) AS first_date,
          MAX(last_date) AS last_date
        FROM country_flow_daily_stats
        WHERE victim_country = ?
          ${query.startDate ? 'AND occurred_date >= ?' : ''}
          ${query.endDate ? 'AND occurred_date <= ?' : ''}
        GROUP BY attacker_country, victim_country`,
        params,
      );

      const incidents: HoverIncident[] = incidentRows.map((row) => ({
        id: row.id,
        uuid: row.id,
        occurredAt: row.occurred_at,
        occurredDate: row.occurred_date,
        date: row.occurred_date,
        attackerCountry: row.attacker_country,
        victimCountry: row.victim_country,
        severity: row.severity,
        title: row.title,
        summary: row.summary,
        details: {
          title: row.title,
          summary: row.summary,
          severity: row.severity,
        },
        sourceLabel: row.source_label,
        sourceAddress: row.source_address,
      }));

      const flows: HoverFlow[] = flowRows.map((row) => ({
        attackerCountry: row.attacker_country,
        victimCountry: row.victim_country,
        count: row.incident_count,
        uuids: incidents
          .filter((incident) => incident.attackerCountry === row.attacker_country)
          .map((incident) => incident.id),
        firstDate: row.first_date,
        lastDate: row.last_date,
      })).sort(compareFlows);

      return {
        victimCountry: query.victimCountry,
        startDate: query.startDate,
        endDate: query.endDate,
        total: incidents.length,
        totalIncidents: incidents.length,
        sourceCount: flows.length,
        incidents,
        flows,
        generatedAt: buildGeneratedAt(),
      };
    },

    getAllFlowsSummary(query: ThreatMapQuery): AllFlowResponse {
      const range = buildRangeWhere(query.startDate, query.endDate);
      const rows = repository.all<{
        attacker_country: string;
        victim_country: string;
        incident_count: number;
        first_date: string;
        last_date: string;
      }>(
        `SELECT
          attacker_country,
          victim_country,
          SUM(incident_count) AS incident_count,
          MIN(first_date) AS first_date,
          MAX(last_date) AS last_date
        FROM country_flow_daily_stats
        ${range.sql}
        GROUP BY attacker_country, victim_country`,
        range.params,
      );

      const flows: HoverFlow[] = rows.map((row) => ({
        attackerCountry: row.attacker_country,
        victimCountry: row.victim_country,
        count: row.incident_count,
        uuids: [],
        firstDate: row.first_date,
        lastDate: row.last_date,
      })).sort(compareFlows);

      return {
        startDate: query.startDate,
        endDate: query.endDate,
        total: flows.length,
        totalFlows: flows.length,
        flows,
        generatedAt: buildGeneratedAt(),
      };
    },

    getLatestContentFeed(query: LatestContentQuery): LatestContentResponse {
      const rows = repository.all<{
        id: string;
        external_id: string;
        category: string;
        title: string;
        summary: string;
        published_at: string;
      }>(
        `SELECT
          id,
          external_id,
          category,
          title,
          summary,
          published_at
        FROM content_items
        WHERE category = ?
        ORDER BY published_at DESC, id DESC
        LIMIT ? OFFSET ?`,
        [query.category, String(query.limit), String(query.offset)],
      );
      const totalRow = repository.get<{ total: number }>(
        'SELECT COUNT(*) AS total FROM content_items WHERE category = ?',
        [query.category],
      );

      return {
        category: query.category,
        total: totalRow?.total ?? 0,
        limit: query.limit,
        offset: query.offset,
        generatedAt: buildGeneratedAt(),
        items: rows.map((row) => ({
          id: row.id,
          externalId: row.external_id,
          category: row.category,
          title: row.title,
          summary: row.summary,
          publishedAt: row.published_at,
          createdAt: row.published_at,
        })),
      };
    },
  };
}

export type ComputeService = ReturnType<typeof createComputeService>;
