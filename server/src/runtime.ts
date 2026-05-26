import type { DatabaseSync } from 'node:sqlite';
import { openDatabase, type DatabaseOptions } from './storage/database.js';
import { initializeSchema } from './storage/schema.js';
import { createRepository } from './storage/repository.js';
import { createIngestService } from './ingest/service.js';
import { createComputeService } from './compute/service.js';
import { loadSeedFixtures } from './fixtures/loader.js';

export interface ServerRuntime {
  db: DatabaseSync;
  repository: ReturnType<typeof createRepository>;
  ingestService: ReturnType<typeof createIngestService>;
  computeService: ReturnType<typeof createComputeService>;
  close: () => void;
}

export function createServerRuntime(options: DatabaseOptions = {}): ServerRuntime {
  const db = openDatabase(options);
  initializeSchema(db);

  const repository = createRepository(db);
  const ingestService = createIngestService(db, repository);
  const computeService = createComputeService(repository);
  const fixtures = loadSeedFixtures();

  ingestService.ensureSeedData({
    incidents: fixtures.incidents,
  });
  ingestService.rebuildAggregates();

  return {
    db,
    repository,
    ingestService,
    computeService,
    close: () => db.close(),
  };
}
