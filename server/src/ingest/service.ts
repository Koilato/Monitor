import type { DatabaseSync } from 'node:sqlite';
import type { HoverIncidentSeed, LatestContentItemSeed } from '../../../shared/types.js';
import { normalizeContentInput, normalizeIncidentInput } from './normalize.js';
import type { StorageRepository } from '../storage/repository.js';
import { rebuildAggregateTables } from '../storage/schema.js';

export interface ImportSummary {
  status: 'success' | 'partial_success' | 'failed';
  totalCount: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface IngestService {
  ensureSeedData(input: {
    incidents: HoverIncidentSeed[];
    contentItems: LatestContentItemSeed[];
  }): void;
  seed(input: {
    incidents: HoverIncidentSeed[];
    contentItems: LatestContentItemSeed[];
  }): ImportSummary;
  importIncidents(records: unknown[], sourceCode: string, sourceLabel?: string): ImportSummary;
  importContent(records: unknown[], sourceCode: string, sourceLabel?: string): ImportSummary;
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

export function createIngestService(
  db: DatabaseSync,
  repository: StorageRepository,
): IngestService {
  return {
    ensureSeedData(input) {
      if (repository.countIncidents() > 0 || repository.countContent() > 0) {
        return;
      }

      this.seed(input);
    },

    seed(input) {
      this.importIncidents(input.incidents, 'mock_seed', 'Mock Seed');
      return this.importContent(input.contentItems, 'mock_seed', 'Mock Seed');
    },

    importIncidents(records, sourceCode, sourceLabel = sourceCode) {
      const sourceId = repository.getOrCreateSourceId(sourceCode, sourceLabel);
      const startedAt = new Date().toISOString();
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      repository.transaction(() => {
        for (const [index, record] of records.entries()) {
          try {
            const normalized = normalizeIncidentInput(record);
            const now = new Date().toISOString();
            const result = repository.insertIncident({
              ...normalized,
              sourceId,
              createdAt: now,
              updatedAt: now,
            });
            if (result.inserted) {
              successCount += 1;
            }
          } catch (error) {
            failureCount += 1;
            errors.push(`incident[${index}]: ${(error as Error).message}`);
          }
        }
      });

      rebuildAggregateTables(db);

      const totalCount = records.length;
      const status = resolveStatus(totalCount, successCount, failureCount);
      repository.insertIngestBatch({
        batchType: 'import-incidents',
        sourceCode,
        status,
        totalCount,
        successCount,
        failureCount,
        errorSummary: summarizeErrors(errors),
        metadataJson: null,
        startedAt,
        completedAt: new Date().toISOString(),
      });

      return { status, totalCount, successCount, failureCount, errors };
    },

    importContent(records, sourceCode, sourceLabel = sourceCode) {
      const sourceId = repository.getOrCreateSourceId(sourceCode, sourceLabel);
      const startedAt = new Date().toISOString();
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      repository.transaction(() => {
        for (const [index, record] of records.entries()) {
          try {
            const normalized = normalizeContentInput(record);
            const now = new Date().toISOString();
            const result = repository.insertContent({
              ...normalized,
              sourceId,
              createdAt: now,
              updatedAt: now,
            });
            if (result.inserted) {
              successCount += 1;
            }
          } catch (error) {
            failureCount += 1;
            errors.push(`content[${index}]: ${(error as Error).message}`);
          }
        }
      });

      const totalCount = records.length;
      const status = resolveStatus(totalCount, successCount, failureCount);
      repository.insertIngestBatch({
        batchType: 'import-content',
        sourceCode,
        status,
        totalCount,
        successCount,
        failureCount,
        errorSummary: summarizeErrors(errors),
        metadataJson: null,
        startedAt,
        completedAt: new Date().toISOString(),
      });

      return { status, totalCount, successCount, failureCount, errors };
    },

    rebuildAggregates() {
      rebuildAggregateTables(db);
    },
  };
}
