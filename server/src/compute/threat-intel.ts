import type {
  ThreatIntelQuery,
  ThreatIntelResponse,
} from '../../../shared/types.js';
import type { StorageRepository } from '../storage/repository.js';
import {
  buildGeneratedAt,
  getCountryLabel,
  SEVERITY_TO_THREAT_INTEL,
} from './common.js';
import { deriveCompatIncident } from './derived-incidents.js';

export function createThreatIntelComputeService(repository: StorageRepository) {
  return {
    getThreatIntelFeed(query: ThreatIntelQuery): ThreatIntelResponse {
      const mappings = new Map(
        repository.listGroupCountryMappings().map((mapping) => [mapping.groupName, mapping.attackerCountry]),
      );

      const items = repository.listIncidentRows()
        .map((row) => {
          const attackerCountry = mappings.get(row.groupName);
          if (!attackerCountry) {
            return null;
          }

          const incident = deriveCompatIncident(row, attackerCountry);
          return {
            id: incident.id,
            ...SEVERITY_TO_THREAT_INTEL[incident.severity],
            severity: incident.severity,
            victim: incident.title,
            attacker: getCountryLabel(incident.attackerCountry),
            source: getCountryLabel(incident.attackerCountry),
            address: getCountryLabel(incident.victimCountry),
            linkUrl: incident.sourceAddress,
            attackerCountry: incident.attackerCountry,
            victimCountry: incident.victimCountry,
            occurredAt: incident.occurredAt,
            occurredDate: incident.occurredDate,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
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
