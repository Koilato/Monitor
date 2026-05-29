import type { DatabaseSync } from 'node:sqlite';
import type { StorageRepository } from './repository.js';
import {
  deriveCompatIncident,
  type CompatIncident,
} from '../compute/derived-incidents.js';

type AggregateCountryRow = {
  occurredDate: string;
  victimCountry: string;
  incidentCount: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  eventLevel: CompatIncident['severity'];
};

type AggregateFlowRow = AggregateCountryRow & {
  attackerCountry: string;
  firstDate: string;
  lastDate: string;
};

const INCIDENTS_TABLE_SQL = `
  CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    victim TEXT NOT NULL,
    group_name TEXT NOT NULL,
    victim_country TEXT NOT NULL,
    activity TEXT NOT NULL,
    attackdate TEXT NOT NULL,
    discovered TEXT NOT NULL,
    description TEXT,
    website TEXT NOT NULL,
    permalink TEXT NOT NULL,
    post_url TEXT NOT NULL,
    press TEXT NOT NULL,
    infostealer_json TEXT NOT NULL,
    ransom_raw TEXT NOT NULL,
    screenshot TEXT NOT NULL,
    ingested_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  )
`;

const GROUP_COUNTRY_MAPPINGS_TABLE_SQL = `
  CREATE TABLE group_country_mappings (
    group_name TEXT PRIMARY KEY,
    attacker_country TEXT NOT NULL,
    assigned_at TEXT NOT NULL
  )
`;

const COUNTRY_DAILY_STATS_TABLE_SQL = `
  CREATE TABLE country_daily_stats (
    occurred_date TEXT NOT NULL,
    victim_country TEXT NOT NULL,
    incident_count INTEGER NOT NULL,
    low_count INTEGER NOT NULL,
    medium_count INTEGER NOT NULL,
    high_count INTEGER NOT NULL,
    event_level TEXT NOT NULL,
    PRIMARY KEY (occurred_date, victim_country)
  )
`;

const COUNTRY_FLOW_DAILY_STATS_TABLE_SQL = `
  CREATE TABLE country_flow_daily_stats (
    occurred_date TEXT NOT NULL,
    attacker_country TEXT NOT NULL,
    victim_country TEXT NOT NULL,
    incident_count INTEGER NOT NULL,
    low_count INTEGER NOT NULL,
    medium_count INTEGER NOT NULL,
    high_count INTEGER NOT NULL,
    event_level TEXT NOT NULL,
    first_date TEXT NOT NULL,
    last_date TEXT NOT NULL,
    PRIMARY KEY (occurred_date, attacker_country, victim_country)
  )
`;

function getTableColumns(db: DatabaseSync, tableName: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

function ensureTableSchema(
  db: DatabaseSync,
  tableName: string,
  createSql: string,
  expectedColumns: string[],
): void {
  const existingColumns = getTableColumns(db, tableName);
  const schemaMatches = existingColumns.length === expectedColumns.length
    && expectedColumns.every((columnName, index) => existingColumns[index] === columnName);

  if (!schemaMatches) {
    db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    db.exec(createSql);
  }
}

function ensureIncidentsDescriptionNullable(db: DatabaseSync): void {
  const rows = db.prepare('PRAGMA table_info(incidents)').all() as Array<{ name: string; notnull: number }>;
  const descriptionColumn = rows.find((row) => row.name === 'description');
  if (!descriptionColumn || descriptionColumn.notnull === 0) {
    return;
  }

  db.exec('DROP TABLE IF EXISTS incidents');
  db.exec(INCIDENTS_TABLE_SQL);
}

function getEventLevel(lowCount: number, mediumCount: number, highCount: number): CompatIncident['severity'] {
  if (highCount > 0) {
    return 'high';
  }
  if (mediumCount > 0) {
    return 'medium';
  }
  return 'low';
}

export function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS incident_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingest_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_type TEXT NOT NULL,
      source_code TEXT NOT NULL,
      status TEXT NOT NULL,
      total_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      error_summary TEXT,
      metadata_json TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  ensureTableSchema(db, 'incidents', INCIDENTS_TABLE_SQL, [
    'id',
    'victim',
    'group_name',
    'victim_country',
    'activity',
    'attackdate',
    'discovered',
    'description',
    'website',
    'permalink',
    'post_url',
    'press',
    'infostealer_json',
    'ransom_raw',
    'screenshot',
    'ingested_at',
    'raw_json',
  ]);
  ensureIncidentsDescriptionNullable(db);

  ensureTableSchema(db, 'group_country_mappings', GROUP_COUNTRY_MAPPINGS_TABLE_SQL, [
    'group_name',
    'attacker_country',
    'assigned_at',
  ]);

  ensureTableSchema(db, 'country_daily_stats', COUNTRY_DAILY_STATS_TABLE_SQL, [
    'occurred_date',
    'victim_country',
    'incident_count',
    'low_count',
    'medium_count',
    'high_count',
    'event_level',
  ]);

  ensureTableSchema(db, 'country_flow_daily_stats', COUNTRY_FLOW_DAILY_STATS_TABLE_SQL, [
    'occurred_date',
    'attacker_country',
    'victim_country',
    'incident_count',
    'low_count',
    'medium_count',
    'high_count',
    'event_level',
    'first_date',
    'last_date',
  ]);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_incidents_attackdate ON incidents(attackdate DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_discovered ON incidents(discovered DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_victim_country ON incidents(victim_country, attackdate DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_group_name ON incidents(group_name);
    CREATE INDEX IF NOT EXISTS idx_country_daily_stats_date_country ON country_daily_stats(occurred_date, victim_country);
    CREATE INDEX IF NOT EXISTS idx_country_flow_daily_stats_date_victim_attacker ON country_flow_daily_stats(occurred_date, victim_country, attacker_country);
  `);
}

export function rebuildAggregateTables(repository: StorageRepository): void {
  const incidents = repository.listIncidentRows();
  const mappings = new Map(
    repository.listGroupCountryMappings().map((mapping) => [mapping.groupName, mapping.attackerCountry]),
  );

  const countryMap = new Map<string, AggregateCountryRow>();
  const flowMap = new Map<string, AggregateFlowRow>();

  for (const row of incidents) {
    const attackerCountry = mappings.get(row.groupName);
    if (!attackerCountry) {
      continue;
    }

    const incident = deriveCompatIncident(row, attackerCountry);
    const countryKey = `${incident.occurredDate}|${incident.victimCountry}`;
    const flowKey = `${incident.occurredDate}|${incident.attackerCountry}|${incident.victimCountry}`;

    const countryRow = countryMap.get(countryKey) ?? {
      occurredDate: incident.occurredDate,
      victimCountry: incident.victimCountry,
      incidentCount: 0,
      lowCount: 0,
      mediumCount: 0,
      highCount: 0,
      eventLevel: 'low',
    };
    countryRow.incidentCount += 1;
    if (incident.severity === 'low') {
      countryRow.lowCount += 1;
    } else if (incident.severity === 'medium') {
      countryRow.mediumCount += 1;
    } else {
      countryRow.highCount += 1;
    }
    countryRow.eventLevel = getEventLevel(countryRow.lowCount, countryRow.mediumCount, countryRow.highCount);
    countryMap.set(countryKey, countryRow);

    const flowRow = flowMap.get(flowKey) ?? {
      occurredDate: incident.occurredDate,
      attackerCountry: incident.attackerCountry,
      victimCountry: incident.victimCountry,
      incidentCount: 0,
      lowCount: 0,
      mediumCount: 0,
      highCount: 0,
      eventLevel: 'low',
      firstDate: incident.occurredDate,
      lastDate: incident.occurredDate,
    };
    flowRow.incidentCount += 1;
    if (incident.severity === 'low') {
      flowRow.lowCount += 1;
    } else if (incident.severity === 'medium') {
      flowRow.mediumCount += 1;
    } else {
      flowRow.highCount += 1;
    }
    flowRow.eventLevel = getEventLevel(flowRow.lowCount, flowRow.mediumCount, flowRow.highCount);
    if (incident.occurredDate < flowRow.firstDate) {
      flowRow.firstDate = incident.occurredDate;
    }
    if (incident.occurredDate > flowRow.lastDate) {
      flowRow.lastDate = incident.occurredDate;
    }
    flowMap.set(flowKey, flowRow);
  }

  repository.replaceCountryDailyStats([...countryMap.values()]);
  repository.replaceCountryFlowDailyStats([...flowMap.values()]);
}
