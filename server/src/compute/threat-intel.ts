import type {
  ThreatIntelQuery,
  ThreatIntelResponse,
} from '../../../shared/types.js';
import type { CompatIncidentStore } from './compat-incidents.js';
import {
  buildGeneratedAt,
  SEVERITY_TO_THREAT_INTEL,
} from './common.js';

export function createThreatIntelComputeService(compatIncidentStore: CompatIncidentStore) {
  return {
    getThreatIntelFeed(query: ThreatIntelQuery): ThreatIntelResponse {
      const items = compatIncidentStore.getIncidents()
        .map((incident) => {
          return {
            id: incident.id,
            ...SEVERITY_TO_THREAT_INTEL[incident.severity],
            severity: incident.severity,
            victim: incident.title,
            attacker: incident.attackerCountryName ?? incident.attackerCountry,
            source: incident.attackerCountryName ?? incident.attackerCountry,
            address: incident.victimCountryName ?? incident.victimCountry,
            linkUrl: incident.sourceAddress,
            attackerCountry: incident.attackerCountry,
            victimCountry: incident.victimCountry,
            occurredAt: incident.occurredAt,
            occurredDate: incident.occurredDate,
          };
        })
        .filter((item) => !query.startDate || item.occurredDate >= query.startDate)
        .filter((item) => !query.endDate || item.occurredDate <= query.endDate)
        .filter((item) => !query.severity || item.severity === query.severity)
        .filter((item) => !query.victimCountry || item.victimCountry === query.victimCountry)
        .filter((item) => !query.attackerCountry || item.attackerCountry === query.attackerCountry)
        .sort((left, right) => query.sort === 'asc'
          ? left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
          : right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id),
        );

      const total = items.length;

      return {
        sort: query.sort,
        total,
        limit: query.limit,
        offset: query.offset,
        generatedAt: buildGeneratedAt(),
        items: items.slice(query.offset, query.offset + query.limit).map(({ occurredDate: _occurredDate, ...item }) => item),
      };
    },
  };
}
