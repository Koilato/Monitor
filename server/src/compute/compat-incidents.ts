import type { HoverIncident } from '../../../shared/types.js';
import type { StorageRepository } from '../storage/repository.js';
import { deriveCompatIncident } from './derived-incidents.js';
import {
  formatDateTimeLabel,
  formatRansomAmountLabel,
  getCountryLabel,
  getSeverityLabel,
} from './common.js';

export interface CompatIncidentStore {
  getIncidents: () => HoverIncident[];
}

export function createCompatIncidentStore(repository: StorageRepository): CompatIncidentStore {
  let cachedVersion: string | null = null;
  let cachedIncidents: HoverIncident[] = [];

  return {
    getIncidents(): HoverIncident[] {
      const version = repository.getDataVersion();
      if (version === cachedVersion) {
        return cachedIncidents;
      }

      const mappings = new Map(
        repository.listGroupCountryMappings().map((mapping) => [mapping.groupName, mapping.attackerCountry]),
      );

      const incidents: Array<HoverIncident | null> = repository.listIncidentRows()
        .map((row) => {
          const attackerCountry = mappings.get(row.groupName);
          if (!attackerCountry) {
            return null;
          }

          const incident = deriveCompatIncident(row, attackerCountry);
          return {
            ...incident,
            occurredAtLabel: formatDateTimeLabel(incident.occurredAt),
            attackerCountryName: getCountryLabel(incident.attackerCountry),
            victimCountryName: getCountryLabel(incident.victimCountry),
            severityLabel: getSeverityLabel(incident.severity),
            ransomAmountLabel: formatRansomAmountLabel(incident.ransomAmount),
            summaryRaw: row.description,
            groupName: row.groupName,
            linkUrl: incident.sourceAddress,
            details: {
              title: incident.title,
              summary: incident.summary,
              severity: incident.severity,
            },
          };
        });

      cachedIncidents = incidents.filter((incident): incident is HoverIncident => incident !== null);
      cachedVersion = version;

      return cachedIncidents;
    },
  };
}
