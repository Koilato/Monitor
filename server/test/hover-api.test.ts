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

test('country hover endpoint serves seeded incident detail from SQLite', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/map/countries/CN?startDate=2026-04-19&endDate=2026-04-19`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.victimCountry, 'CN');
    assert.equal(body.totalIncidents, 3);
    assert.equal(body.sourceCount, 3);
    assert.equal(body.generatedAt.length > 0, true);
    assert.deepEqual(
      body.incidents.map((incident: { id: string }) => incident.id),
      ['mock-019c', 'mock-019b', 'mock-019a'],
    );
  } finally {
    await context.cleanup();
  }
});

test('map summary endpoint aggregates seeded threats from SQLite', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/map/summary?startDate=2026-04-19&endDate=2026-04-19`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.totalIncidents, 11);
    assert.equal(body.total, 11);
    assert.deepEqual(
      body.countries.map((country: { country: string; eventLevel: string; incidentCount: number }) => `${country.country}:${country.eventLevel}:${country.incidentCount}`),
      ['CN:high:3', 'DK:high:2', 'CA:high:1', 'ES:high:1', 'NL:high:1', 'DE:medium:1', 'FR:low:1', 'JP:low:1'],
    );
  } finally {
    await context.cleanup();
  }
});

test('all flows endpoint returns aggregated flow lines from SQLite', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/map/flows?startDate=2026-04-01&endDate=2026-04-22`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.totalFlows, body.flows.length);
    assert.equal(body.total, body.flows.length);
    assert.equal(body.flows[0].attackerCountry, 'DE');
    assert.equal(body.flows[0].victimCountry, 'GB');
    assert.equal(body.flows[0].count, 11);
  } finally {
    await context.cleanup();
  }
});

test('country endpoint returns nested validation error payload', async () => {
  const context = await startTestServer();

  try {
    const response = await fetch(`${context.baseUrl}/api/v1/map/countries/CHN`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'validation_error');
    assert.equal(body.error.message, '必须是有效的两位国家代码');
  } finally {
    await context.cleanup();
  }
});
