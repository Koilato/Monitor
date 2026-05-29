import type { DatabaseSync } from 'node:sqlite';
import type { StorageRepository } from '../storage/repository.js';
import { rebuildAggregateTables } from '../storage/schema.js';
import {
  fetchGroupCountryMappings,
  fetchRecentVictimRows,
} from './ransomware-live.js';
import { fetchRansomLookRows } from './ransomlook.js';

export interface ImportSummary {
  status: 'success' | 'partial_success' | 'failed';
  totalCount: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface IngestService {
  importRecentVictims(): Promise<ImportSummary>;
  rebuildAggregates(): void;
}

function summarizeErrors(errors: string[]): string | null {
  if (errors.length === 0) {
    return null;
  }

  return errors.slice(0, 10).join('\n');
}

function resolveStatus(totalCount: number, successCount: number, failureCount: number): ImportSummary['status'] {
  if (successCount === totalCount && failureCount === 0) {
    return 'success';
  }
  if (successCount === 0) {
    return 'failed';
  }
  return 'partial_success';
}

function mergeIncidents<T extends { id: string }>(...recordGroups: T[][]): T[] {
  const deduped = new Map<string, T>();
  for (const records of recordGroups) {
    for (const record of records) {
      deduped.set(record.id, record);
    }
  }
  return [...deduped.values()];
}

export function createIngestService(
  _db: DatabaseSync,
  repository: StorageRepository,
): IngestService {
  return {
    async importRecentVictims() {
      const startedAt = new Date().toISOString();
      const errors: string[] = [];

      try {
        const [ransomwareLiveIncidents, ransomLookIncidents, groupCountryMappings] = await Promise.all([
          fetchRecentVictimRows(),
          fetchRansomLookRows().catch((error) => {
            errors.push(error instanceof Error ? error.message : String(error));
            return [];
          }),
          fetchGroupCountryMappings(),
        ]);
        const incidents = mergeIncidents(ransomwareLiveIncidents, ransomLookIncidents);

        repository.transaction(() => {
          repository.getOrCreateSourceId('ransomware_live_recent_priority_asia', 'Ransomware.live Recent + Priority Asia Victims');
          repository.getOrCreateSourceId('ransomlook_export_posts', 'RansomLook Export Posts');
          repository.replaceGroupCountryMappings(groupCountryMappings);
          repository.replaceIncidents(incidents);
          rebuildAggregateTables(repository);
        });

        const totalCount = incidents.length;
        const successCount = incidents.length;
        const failureCount = 0;
        const status = resolveStatus(totalCount, successCount, failureCount);

        repository.insertIngestBatch({
          batchType: 'import-recent-victims',
          sourceCode: 'ransomware_live_recent_priority_asia',
          status,
          totalCount,
          successCount,
          failureCount,
          errorSummary: summarizeErrors(errors),
          metadataJson: JSON.stringify({
            order: 'attacked',
            targetCount: 1200,
            incidentCount: incidents.length,
            ransomwareLiveIncidentCount: ransomwareLiveIncidents.length,
            ransomLookIncidentCount: ransomLookIncidents.length,
            mappingCount: groupCountryMappings.length,
          }),
          startedAt,
          completedAt: new Date().toISOString(),
        });

        return { status, totalCount, successCount, failureCount, errors };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        const status: ImportSummary['status'] = 'failed';

        repository.insertIngestBatch({
          batchType: 'import-recent-victims',
          sourceCode: 'ransomware_live_recent_priority_asia',
          status,
          totalCount: 0,
          successCount: 0,
          failureCount: 1,
          errorSummary: summarizeErrors(errors),
          metadataJson: JSON.stringify({ order: 'attacked', targetCount: 1200 }),
          startedAt,
          completedAt: new Date().toISOString(),
        });

        return {
          status,
          totalCount: 0,
          successCount: 0,
          failureCount: 1,
          errors,
        };
      }
    },

    rebuildAggregates() {
      rebuildAggregateTables(repository);
    },
  };
}
