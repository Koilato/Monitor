import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface DatabaseOptions {
  path?: string;
}

export function resolveDatabasePath(pathOverride?: string): string {
  if (pathOverride) {
    return resolve(pathOverride);
  }

  if (process.env.WORLDMONITOR_DB_PATH) {
    return resolve(process.env.WORLDMONITOR_DB_PATH);
  }

  return resolve(process.cwd(), 'server/data/worldmonitor.sqlite');
}

export function openDatabase(options: DatabaseOptions = {}): DatabaseSync {
  const databasePath = resolveDatabasePath(options.path);
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA synchronous = NORMAL;');

  return db;
}
