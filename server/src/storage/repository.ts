import type { DatabaseSync } from 'node:sqlite';
import type { EventLevel } from '../../../shared/types.js';

type SQLiteValue = string | number | bigint | Uint8Array | null;

export interface IncidentRow {
  id: string;
  externalId: string;
  sourceId: number;
  occurredAt: string;
  occurredDate: string;
  attackerCountry: string;
  victimCountry: string;
  severity: EventLevel;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceAddress: string;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRow {
  id: string;
  externalId: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  sourceId: number;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchInsertResult {
  inserted: boolean;
}

export interface IngestBatchRecord {
  batchType: string;
  sourceCode: string;
  status: 'success' | 'partial_success' | 'failed' | 'running';
  totalCount: number;
  successCount: number;
  failureCount: number;
  errorSummary: string | null;
  metadataJson: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function createRepository(db: DatabaseSync) {
  const getSourceByCode = db.prepare('SELECT id, code FROM incident_sources WHERE code = ?');
  const insertSource = db.prepare('INSERT INTO incident_sources (code, label, created_at) VALUES (?, ?, ?)');
  const insertBatch = db.prepare(`
    INSERT INTO ingest_batches (
      batch_type,
      source_code,
      status,
      total_count,
      success_count,
      failure_count,
      error_summary,
      metadata_json,
      started_at,
      completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIncident = db.prepare(`
    INSERT OR IGNORE INTO incidents (
      id,
      external_id,
      source_id,
      occurred_at,
      occurred_date,
      attacker_country,
      victim_country,
      severity,
      title,
      summary,
      source_label,
      source_address,
      dedupe_key,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertContent = db.prepare(`
    INSERT OR IGNORE INTO content_items (
      id,
      external_id,
      category,
      title,
      summary,
      published_at,
      source_id,
      dedupe_key,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const countIncidents = db.prepare('SELECT COUNT(*) AS total FROM incidents');
  const countContent = db.prepare('SELECT COUNT(*) AS total FROM content_items');

  return {
    getOrCreateSourceId(code: string, label = code): number {
      const existing = getSourceByCode.get(code) as { id: number; code: string } | undefined;
      if (existing) {
        return existing.id;
      }

      const createdAt = new Date().toISOString();
      insertSource.run(code, label, createdAt);
      return Number(db.prepare('SELECT id FROM incident_sources WHERE code = ?').get(code)?.id);
    },

    insertIngestBatch(record: IngestBatchRecord): number {
      insertBatch.run(
        record.batchType,
        record.sourceCode,
        record.status,
        record.totalCount,
        record.successCount,
        record.failureCount,
        record.errorSummary,
        record.metadataJson,
        record.startedAt,
        record.completedAt,
      );

      return Number(db.prepare('SELECT last_insert_rowid() AS id').get()?.id);
    },

    insertIncident(record: IncidentRow): BatchInsertResult {
      insertIncident.run(
        record.id,
        record.externalId,
        record.sourceId,
        record.occurredAt,
        record.occurredDate,
        record.attackerCountry,
        record.victimCountry,
        record.severity,
        record.title,
        record.summary,
        record.sourceLabel,
        record.sourceAddress,
        record.dedupeKey,
        record.createdAt,
        record.updatedAt,
      );
      const afterChanges = db.prepare('SELECT changes() AS count').get() as { count: number };
      return { inserted: afterChanges.count > 0 };
    },

    insertContent(record: ContentRow): BatchInsertResult {
      insertContent.run(
        record.id,
        record.externalId,
        record.category,
        record.title,
        record.summary,
        record.publishedAt,
        record.sourceId,
        record.dedupeKey,
        record.createdAt,
        record.updatedAt,
      );
      const afterChanges = db.prepare('SELECT changes() AS count').get() as { count: number };
      return { inserted: afterChanges.count > 0 };
    },

    countIncidents(): number {
      return Number((countIncidents.get() as { total: number }).total);
    },

    countContent(): number {
      return Number((countContent.get() as { total: number }).total);
    },

    all<T>(sql: string, params: SQLiteValue[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },

    get<T>(sql: string, params: SQLiteValue[] = []): T | undefined {
      return db.prepare(sql).get(...params) as T | undefined;
    },

    transaction<T>(fn: () => T): T {
      db.exec('BEGIN');
      try {
        const result = fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export type StorageRepository = ReturnType<typeof createRepository>;
