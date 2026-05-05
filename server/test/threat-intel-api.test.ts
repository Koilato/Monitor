import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createServerRuntime, type ServerRuntime } from '../src/runtime.js';

async function startTestServer(): Promise<{
  baseUrl: string;
  server: Server;
  runtime: ServerRuntime;
  cleanup: () => Promise<void>;
}> {
  const workingDir = mkdtempSync(join(tmpdir(), 'worldmonitor-server-'));
  const dbPath = join(workingDir, 'worldmonitor.sqlite');
  const runtime = createServerRuntime({ path: dbPath });
  const server = createServer(createApp({ runtime }));
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
    runtime,
    cleanup: async () => {
      server.close();
      await once(server, 'close');
      runtime.close();
      rmSync(workingDir, { recursive: true, force: true });
    },
  };
}

test('threat intel endpoint serves newest-first data from SQLite', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/intel/feed?limit=20`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.sort, 'desc');
    assert.equal(body.total, 223);
    assert.equal(body.items.length, 20);
    assert.match(body.items[0].occurredAt, /^2026-04-26T/);
    assert.equal(body.generatedAt.length > 0, true);
  } finally {
    await context.cleanup();
  }
});

test('threat intel endpoint supports ascending pagination and filters', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/intel/feed?sort=asc&limit=5&offset=2&victimCountry=CN&severity=high`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.sort, 'asc');
    assert.equal(body.items.length, 5);
    assert.ok(body.items.every((item: { victimCountry: string; severity: string }) => item.victimCountry === 'CN' && item.severity === 'high'));
  } finally {
    await context.cleanup();
  }
});

test('latest content endpoint serves seeded database rows', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/content/feed?category=sql&limit=2&offset=1`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.category, 'sql');
    assert.equal(body.total, 5);
    assert.deepEqual(body.items.map((item: { id: string }) => item.id), ['sql-009', 'sql-008']);
  } finally {
    await context.cleanup();
  }
});

test('manual incident import tolerates partial failures and deduplicates repeated rows', () => {
  const workingDir = mkdtempSync(join(tmpdir(), 'worldmonitor-server-'));
  const dbPath = join(workingDir, 'worldmonitor.sqlite');
  const runtime = createServerRuntime({ path: dbPath });

  try {
    const beforeCount = runtime.repository.countIncidents();
    const result = runtime.ingestService.importIncidents([
      {
        externalId: 'manual-001',
        occurredAt: '2026-05-01T01:02:03Z',
        attackerCountry: 'US',
        victimCountry: 'CN',
        severity: 'high',
        title: 'Manual incident',
        summary: 'Imported from manual test payload',
      },
      {
        externalId: 'manual-001',
        occurredAt: '2026-05-01T01:02:03Z',
        attackerCountry: 'US',
        victimCountry: 'CN',
        severity: 'high',
        title: 'Manual incident',
        summary: 'Imported from manual test payload',
      },
      {
        externalId: '',
      },
    ], 'manual_import', 'Manual Import');

    assert.equal(result.status, 'partial_success');
    assert.equal(result.totalCount, 3);
    assert.equal(result.successCount, 1);
    assert.equal(result.failureCount, 1);
    assert.equal(runtime.repository.countIncidents(), beforeCount + 1);
  } finally {
    runtime.close();
    rmSync(workingDir, { recursive: true, force: true });
  }
});
