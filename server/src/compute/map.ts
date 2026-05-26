import type {
  AllFlowResponse,
  CountryHoverQuery,
  CountryHoverResponse,
  EventLevel,
  HoverFlow,
  HoverIncident,
  RansomwareKpiResponse,
  ThreatMapQuery,
  ThreatMapResponse,
  ThreatTrendResponse,
} from '../../../shared/types.js';
import type { StorageRepository } from '../storage/repository.js';
import {
  buildGeneratedAt,
  buildRangeWhere,
  compareFlows,
  compareThreatCountries,
  mapSeverityCounts,
} from './common.js';

export function createMapComputeService(repository: StorageRepository) {
  return {
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

    getThreatTrend(query: ThreatMapQuery): ThreatTrendResponse {
      const range = buildRangeWhere(query.startDate, query.endDate);
      const rows = repository.all<{
        date: string;
        low_count: number;
        medium_count: number;
        high_count: number;
        total: number;
      }>(
        `SELECT
          occurred_date AS date,
          SUM(low_count) AS low_count,
          SUM(medium_count) AS medium_count,
          SUM(high_count) AS high_count,
          SUM(incident_count) AS total
        FROM country_daily_stats
        ${range.sql}
        GROUP BY occurred_date
        ORDER BY occurred_date ASC`,
        range.params,
      );

      const days = rows.map((row) => ({
        date: row.date,
        low: row.low_count,
        medium: row.medium_count,
        high: row.high_count,
        total: row.total,
      }));

      return {
        startDate: query.startDate,
        endDate: query.endDate,
        total: days.reduce((sum, day) => sum + day.total, 0),
        days,
        generatedAt: buildGeneratedAt(),
      };
    },

    getRansomwareKpis(query: ThreatMapQuery): RansomwareKpiResponse {
      const range = buildRangeWhere(query.startDate, query.endDate);
      const rows = repository.all<{ ransom_amount: number }>(
        `SELECT ransom_amount
        FROM incidents
        ${range.sql ? `${range.sql} AND ransom_amount > 0` : 'WHERE ransom_amount > 0'}
        ORDER BY ransom_amount ASC`,
        range.params,
      );
      const amounts = rows.map((row) => row.ransom_amount);
      const middleIndex = Math.floor(amounts.length / 2);
      const median = amounts.length === 0
        ? null
        : amounts.length % 2 === 0
          ? Math.round((amounts[middleIndex - 1] + amounts[middleIndex]) / 2)
          : amounts[middleIndex];
      const avg = amounts.length === 0
        ? null
        : Math.round(amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length);

      return {
        startDate: query.startDate,
        endDate: query.endDate,
        max: amounts.at(-1) ?? null,
        median,
        avg,
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
        ransom_amount: number;
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
          ransom_amount,
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
        low_count: number;
        medium_count: number;
        high_count: number;
        event_level: EventLevel;
        first_date: string;
        last_date: string;
      }>(
        `SELECT
          attacker_country,
          victim_country,
          SUM(incident_count) AS incident_count,
          SUM(low_count) AS low_count,
          SUM(medium_count) AS medium_count,
          SUM(high_count) AS high_count,
          CASE
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 3 THEN 'high'
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 2 THEN 'medium'
            ELSE 'low'
          END AS event_level,
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
        ransomAmount: row.ransom_amount,
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
        severityCounts: mapSeverityCounts(row),
        flowLevel: row.event_level,
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
        low_count: number;
        medium_count: number;
        high_count: number;
        event_level: EventLevel;
        first_date: string;
        last_date: string;
      }>(
        `SELECT
          attacker_country,
          victim_country,
          SUM(incident_count) AS incident_count,
          SUM(low_count) AS low_count,
          SUM(medium_count) AS medium_count,
          SUM(high_count) AS high_count,
          CASE
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 3 THEN 'high'
            WHEN MAX(CASE event_level WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 2 THEN 'medium'
            ELSE 'low'
          END AS event_level,
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
        severityCounts: mapSeverityCounts(row),
        flowLevel: row.event_level,
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
  };
}
