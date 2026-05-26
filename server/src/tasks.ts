import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadSeedFixtures } from './fixtures/loader.js';
import { createServerRuntime } from './runtime.js';

function readJsonArray(pathArg: string | undefined, label: string): unknown[] {
  if (!pathArg) {
    throw new Error(`${label} requires a JSON file path`);
  }

  const filePath = resolve(pathArg);
  const payload = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error(`${label} input must be a JSON array`);
  }
  return payload;
}

function main(): void {
  const [, , command, maybePath] = process.argv;
  const runtime = createServerRuntime();
  const fixtures = loadSeedFixtures();

  try {
    if (command === 'seed') {
      const incidents = runtime.ingestService.importIncidents(fixtures.incidents, 'fixture_seed', 'Fixture Seed');
      console.log(JSON.stringify({ incidents }, null, 2));
      return;
    }

    if (command === 'import-incidents') {
      const records = readJsonArray(maybePath, command);
      console.log(JSON.stringify(runtime.ingestService.importIncidents(records, 'manual_import', 'Manual Import'), null, 2));
      return;
    }

    if (command === 'rebuild-aggregates') {
      runtime.ingestService.rebuildAggregates();
      console.log(JSON.stringify({ ok: true }, null, 2));
      return;
    }

    throw new Error(`Unknown command: ${command ?? '(missing)'}`);
  } finally {
    runtime.close();
  }
}

main();
