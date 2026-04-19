import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { buildCountryHoverResponse } from '../src/service.js';
import { buildLatestContentResponse } from '../src/service.js';
import { MOCK_INCIDENTS } from '../src/mock-incidents.js';
import { MOCK_LATEST_CONTENT } from '../src/mock-feed.js';
import { createApp } from '../src/app.js';

test('CN hover response returns 8 incidents with JP and US flows', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'CN',
    startDate: null,
    endDate: null,
  });

  assert.equal(result.total, 8);
  assert.deepEqual(
    result.flows.map((flow) => `${flow.attackerCountry}:${flow.count}`),
    ['JP:4', 'US:4'],
  );
});

test('US hover response returns 2 incidents with CN flow', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'US',
    startDate: null,
    endDate: null,
  });

  assert.equal(result.total, 2);
  assert.deepEqual(
    result.flows.map((flow) => `${flow.attackerCountry}:${flow.count}`),
    ['CN:2'],
  );
});

test('date range filter applies as a closed interval', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'CN',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
  });

  assert.equal(result.total, 4);
  assert.deepEqual(
    result.incidents.map((incident) => incident.uuid),
    ['mock-003', 'mock-004', 'mock-005', 'mock-006'],
  );
});

test('HTTP API returns 400 for invalid country code', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/map/country-hover?victimCountry=CHN`,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'victimCountry must be an ISO2 country code');

  server.close();
  await once(server, 'close');
});

test('latest content response returns newest SQL rows only', () => {
  const result = buildLatestContentResponse(MOCK_LATEST_CONTENT, {
    category: 'sql',
    limit: 3,
    offset: 0,
  });

  assert.equal(result.total, 5);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['sql-010', 'sql-009', 'sql-008'],
  );
});

test('HTTP API returns latest SQL feed', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/content/latest?category=sql&limit=2&offset=1`,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.category, 'sql');
  assert.equal(body.total, 5);
  assert.deepEqual(body.items.map((item: { id: string }) => item.id), ['sql-009', 'sql-008']);

  server.close();
  await once(server, 'close');
});
