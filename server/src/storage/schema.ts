import type { DatabaseSync } from 'node:sqlite';

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

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      source_id INTEGER NOT NULL REFERENCES incident_sources(id),
      occurred_at TEXT NOT NULL,
      occurred_date TEXT NOT NULL,
      attacker_country TEXT NOT NULL,
      victim_country TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_label TEXT NOT NULL,
      source_address TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      published_at TEXT NOT NULL,
      source_id INTEGER NOT NULL REFERENCES incident_sources(id),
      dedupe_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS country_daily_stats (
      occurred_date TEXT NOT NULL,
      victim_country TEXT NOT NULL,
      incident_count INTEGER NOT NULL,
      low_count INTEGER NOT NULL,
      medium_count INTEGER NOT NULL,
      high_count INTEGER NOT NULL,
      event_level TEXT NOT NULL,
      PRIMARY KEY (occurred_date, victim_country)
    );

    CREATE TABLE IF NOT EXISTS country_flow_daily_stats (
      occurred_date TEXT NOT NULL,
      attacker_country TEXT NOT NULL,
      victim_country TEXT NOT NULL,
      incident_count INTEGER NOT NULL,
      first_date TEXT NOT NULL,
      last_date TEXT NOT NULL,
      PRIMARY KEY (occurred_date, attacker_country, victim_country)
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_victim_date ON incidents(victim_country, occurred_date DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_attacker_victim_date ON incidents(attacker_country, victim_country, occurred_date DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity_date ON incidents(severity, occurred_date DESC);
    CREATE INDEX IF NOT EXISTS idx_content_items_category_published_at ON content_items(category, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_country_daily_stats_date_country ON country_daily_stats(occurred_date, victim_country);
    CREATE INDEX IF NOT EXISTS idx_country_flow_daily_stats_date_victim_attacker ON country_flow_daily_stats(occurred_date, victim_country, attacker_country);
  `);
}

export function rebuildAggregateTables(db: DatabaseSync): void {
  db.exec(`
    DELETE FROM country_daily_stats;

    INSERT INTO country_daily_stats (
      occurred_date,
      victim_country,
      incident_count,
      low_count,
      medium_count,
      high_count,
      event_level
    )
    SELECT
      occurred_date,
      victim_country,
      COUNT(*) AS incident_count,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) AS low_count,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) AS medium_count,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS high_count,
      CASE
        WHEN MAX(CASE severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 3 THEN 'high'
        WHEN MAX(CASE severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END) = 2 THEN 'medium'
        ELSE 'low'
      END AS event_level
    FROM incidents
    GROUP BY occurred_date, victim_country;

    DELETE FROM country_flow_daily_stats;

    INSERT INTO country_flow_daily_stats (
      occurred_date,
      attacker_country,
      victim_country,
      incident_count,
      first_date,
      last_date
    )
    SELECT
      occurred_date,
      attacker_country,
      victim_country,
      COUNT(*) AS incident_count,
      MIN(occurred_date) AS first_date,
      MAX(occurred_date) AS last_date
    FROM incidents
    GROUP BY occurred_date, attacker_country, victim_country;
  `);
}
