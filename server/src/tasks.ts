import { createServerRuntime } from './runtime.js';

async function main(): Promise<void> {
  const [, , command] = process.argv;
  const runtime = createServerRuntime();

  try {
    if (command === 'import-recent-victims') {
      console.log(JSON.stringify(await runtime.ingestService.importRecentVictims(), null, 2));
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

void main();
