import type { DatabaseSync } from 'node:sqlite';
import type { EventLevel } from '../../../shared/types.js';

type SQLiteValue = string | number | bigint | Uint8Array | null;

export interface IncidentUpstreamRow {
  id: string;
  victim: string;
  groupName: string;
  victimCountry: string;
  activity: string;
  attackdate: string;
  discovered: string;
  description: string | null;
  website: string;
  permalink: string;
  postUrl: string;
  press: string;
  infostealerJson: string;
  ransomRaw: string;
  screenshot: string;
  ingestedAt: string;
  rawJson: string;
}

export interface GroupCountryMappingRow {
  groupName: string;
  attackerCountry: string;
  assignedAt: string;
}

export interface CountryDailyStatsRow {
  occurredDate: string;
  victimCountry: string;
  incidentCount: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  eventLevel: EventLevel;
}

export interface CountryFlowDailyStatsRow extends CountryDailyStatsRow {
  attackerCountry: string;
  firstDate: string;
  lastDate: string;
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
  let localDataVersion = 0;
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
    INSERT OR REPLACE INTO incidents (
      id,
      victim,
      group_name,
      victim_country,
      activity,
      attackdate,
      discovered,
      description,
      website,
      permalink,
      post_url,
      press,
      infostealer_json,
      ransom_raw,
      screenshot,
      ingested_at,
      raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertGroupCountryMapping = db.prepare(`
    INSERT OR REPLACE INTO group_country_mappings (
      group_name,
      attacker_country,
      assigned_at
    ) VALUES (?, ?, ?)
  `);
  const insertCountryDailyStats = db.prepare(`
    INSERT INTO country_daily_stats (
      occurred_date,
      victim_country,
      incident_count,
      low_count,
      medium_count,
      high_count,
      event_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCountryFlowDailyStats = db.prepare(`
    INSERT INTO country_flow_daily_stats (
      occurred_date,
      attacker_country,
      victim_country,
      incident_count,
      low_count,
      medium_count,
      high_count,
      event_level,
      first_date,
      last_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const countIncidents = db.prepare('SELECT COUNT(*) AS total FROM incidents');
  const getExternalDataVersion = db.prepare('PRAGMA data_version');

  const bumpDataVersion = () => {
    localDataVersion += 1;
  };

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

    replaceIncidents(records: IncidentUpstreamRow[]): BatchInsertResult {
      db.prepare('DELETE FROM incidents').run();
      for (const record of records) {
        insertIncident.run(
          record.id,
          record.victim,
          record.groupName,
          record.victimCountry,
          record.activity,
          record.attackdate,
          record.discovered,
          record.description,
          record.website,
          record.permalink,
          record.postUrl,
          record.press,
          record.infostealerJson,
          record.ransomRaw,
          record.screenshot,
          record.ingestedAt,
          record.rawJson,
        );
      }
      bumpDataVersion();
      return { inserted: records.length > 0 };
    },

    replaceGroupCountryMappings(records: GroupCountryMappingRow[]): void {
      db.prepare('DELETE FROM group_country_mappings').run();
      for (const record of records) {
        insertGroupCountryMapping.run(
          record.groupName,
          record.attackerCountry,
          record.assignedAt,
        );
      }
      bumpDataVersion();
    },

    replaceCountryDailyStats(records: CountryDailyStatsRow[]): void {
      db.prepare('DELETE FROM country_daily_stats').run();
      for (const record of records) {
        insertCountryDailyStats.run(
          record.occurredDate,
          record.victimCountry,
          record.incidentCount,
          record.lowCount,
          record.mediumCount,
          record.highCount,
          record.eventLevel,
        );
      }
      bumpDataVersion();
    },

    replaceCountryFlowDailyStats(records: CountryFlowDailyStatsRow[]): void {
      db.prepare('DELETE FROM country_flow_daily_stats').run();
      for (const record of records) {
        insertCountryFlowDailyStats.run(
          record.occurredDate,
          record.attackerCountry,
          record.victimCountry,
          record.incidentCount,
          record.lowCount,
          record.mediumCount,
          record.highCount,
          record.eventLevel,
          record.firstDate,
          record.lastDate,
        );
      }
      bumpDataVersion();
    },

    listIncidentRows(): IncidentUpstreamRow[] {
      return db.prepare(`
        SELECT
          id,
          victim,
          group_name,
          victim_country,
          activity,
          attackdate,
          discovered,
          description,
          website,
          permalink,
          post_url,
          press,
          infostealer_json,
          ransom_raw,
          screenshot,
          ingested_at,
          raw_json
        FROM incidents
        ORDER BY attackdate DESC, discovered DESC, id DESC
      `).all().map((row) => ({
        id: String((row as Record<string, unknown>).id),
        victim: String((row as Record<string, unknown>).victim),
        groupName: String((row as Record<string, unknown>).group_name),
        victimCountry: String((row as Record<string, unknown>).victim_country),
        activity: String((row as Record<string, unknown>).activity),
        attackdate: String((row as Record<string, unknown>).attackdate),
        discovered: String((row as Record<string, unknown>).discovered),
        description: (() => {
          const value = (row as Record<string, unknown>).description;
          return value == null ? null : String(value);
        })(),
        website: String((row as Record<string, unknown>).website),
        permalink: String((row as Record<string, unknown>).permalink),
        postUrl: String((row as Record<string, unknown>).post_url),
        press: String((row as Record<string, unknown>).press),
        infostealerJson: String((row as Record<string, unknown>).infostealer_json),
        ransomRaw: String((row as Record<string, unknown>).ransom_raw),
        screenshot: String((row as Record<string, unknown>).screenshot),
        ingestedAt: String((row as Record<string, unknown>).ingested_at),
        rawJson: String((row as Record<string, unknown>).raw_json),
      })) as IncidentUpstreamRow[];
    },

    listGroupCountryMappings(): GroupCountryMappingRow[] {
      return db.prepare(`
        SELECT
          group_name,
          attacker_country,
          assigned_at
        FROM group_country_mappings
      `).all().map((row) => ({
        groupName: String((row as Record<string, unknown>).group_name),
        attackerCountry: String((row as Record<string, unknown>).attacker_country),
        assignedAt: String((row as Record<string, unknown>).assigned_at),
      })) as GroupCountryMappingRow[];
    },

    countIncidents(): number {
      return Number((countIncidents.get() as { total: number }).total);
    },

    getDataVersion(): string {
      const row = getExternalDataVersion.get() as Record<string, unknown>;
      return `${localDataVersion}:${String(Object.values(row)[0] ?? 0)}`;
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
