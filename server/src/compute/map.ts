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
import type { CompatIncidentStore } from './compat-incidents.js';
import {
  buildGeneratedAt,
  buildRangeWhere,
  compareFlows,
  compareThreatCountries,
  formatDateRangeLabel,
  getCountryLabel,
  getSeverityLabel,
  mapSeverityCounts,
} from './common.js';

function withinRange(incident: HoverIncident, startDate: string | null, endDate: string | null): boolean {
  if (startDate && incident.occurredDate < startDate) {
    return false;
  }
  if (endDate && incident.occurredDate > endDate) {
    return false;
  }
  return true;
}

export function createMapComputeService(repository: StorageRepository, compatIncidentStore: CompatIncidentStore) {
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
      const amounts = compatIncidentStore.getIncidents()
        .filter((incident) => withinRange(incident, query.startDate, query.endDate))
        .map((incident) => incident.ransomAmount)
        .filter((amount) => amount > 0)
        .sort((left, right) => left - right);

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
      const incidents = compatIncidentStore.getIncidents()
        .filter((incident) => incident.victimCountry === query.victimCountry)
        .filter((incident) => withinRange(incident, query.startDate, query.endDate))
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id));

      const params: string[] = [query.victimCountry];
      if (query.startDate) {
        params.push(query.startDate);
      }
      if (query.endDate) {
        params.push(query.endDate);
      }

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

      const flows: HoverFlow[] = flowRows.map((row) => ({
        attackerCountry: row.attacker_country,
        attackerCountryName: getCountryLabel(row.attacker_country),
        victimCountry: row.victim_country,
        victimCountryName: getCountryLabel(row.victim_country),
        count: row.incident_count,
        severityCounts: mapSeverityCounts(row),
        flowLevel: row.event_level,
        flowLevelLabel: getSeverityLabel(row.event_level),
        uuids: incidents
          .filter((incident) => incident.attackerCountry === row.attacker_country)
          .map((incident) => incident.id),
        firstDate: row.first_date,
        lastDate: row.last_date,
      })).sort(compareFlows);

      return {
        victimCountry: query.victimCountry,
        victimCountryName: getCountryLabel(query.victimCountry),
        startDate: query.startDate,
        endDate: query.endDate,
        rangeLabel: formatDateRangeLabel(query.startDate, query.endDate),
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
        total: flows.reduce((sum, flow) => sum + flow.count, 0),
        totalFlows: flows.length,
        flows,
        generatedAt: buildGeneratedAt(),
      };
    },
  };
}
