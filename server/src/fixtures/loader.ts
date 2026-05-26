import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { HoverIncidentSeed } from '../../../shared/types.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURES_DIR = resolve(CURRENT_DIR, '../../fixtures');

function readJsonArray<T>(path: string): T[] {
  const payload = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error(`Fixture at ${path} must be a JSON array`);
  }

  return payload as T[];
}

export interface SeedFixtures {
  incidents: HoverIncidentSeed[];
}

export function loadSeedFixtures(fixturesDir = DEFAULT_FIXTURES_DIR): SeedFixtures {
  return {
    incidents: readJsonArray<HoverIncidentSeed>(resolve(fixturesDir, 'incidents.json')),
  };
}
