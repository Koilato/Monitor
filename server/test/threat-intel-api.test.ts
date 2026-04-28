import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';

import { createApp } from '../src/app.js';
import { buildThreatIntelItemsFromIncidents, buildThreatIntelResponse } from '../src/service.js';
import { MOCK_INCIDENTS } from '../src/mock-incidents.js';

test('threat intel items are derived from all mock incidents', () => {
  const items = buildThreatIntelItemsFromIncidents(MOCK_INCIDENTS);

  assert.equal(items.length, MOCK_INCIDENTS.length);
  assert.equal(items[0]?.id, MOCK_INCIDENTS[0]?.uuid);
  assert.equal(items[0]?.tone, 'warning');
  assert.equal(items[0]?.level, '警告');
  assert.equal(items[0]?.attacker, '日本');
  assert.equal(items[0]?.address, '中国');
  assert.match(items[0]?.source ?? '', /^\d+\.\d+\.x\.x \(JP\)$/);
  assert.match(items[0]?.occurredAt ?? '', /^2026-04-01T\d{2}:\d{2}:\d{2}Z$/);
});

test('threat intel response defaults to newest-first order', () => {
  const items = buildThreatIntelItemsFromIncidents(MOCK_INCIDENTS);
  const result = buildThreatIntelResponse(items, {
    sort: 'desc',
    limit: 20,
    offset: 0,
  });

  assert.equal(result.total, MOCK_INCIDENTS.length);
  assert.equal(result.items.length, 20);
  assert.ok(result.items[0]?.occurredAt >= result.items[1]!.occurredAt);
  assert.ok(result.items[0]?.occurredAt.startsWith('2026-04-26T'));
});

test('threat intel response supports ascending order and offset', () => {
  const items = buildThreatIntelItemsFromIncidents(MOCK_INCIDENTS);
  const firstPage = buildThreatIntelResponse(items, {
    sort: 'asc',
    limit: 20,
    offset: 0,
  });
  const secondPage = buildThreatIntelResponse(items, {
    sort: 'asc',
    limit: 20,
    offset: 20,
  });

  assert.equal(firstPage.total, MOCK_INCIDENTS.length);
  assert.equal(firstPage.items.length, 20);
  assert.equal(secondPage.items.length, 20);
  assert.ok(firstPage.items[0]?.occurredAt.startsWith('2026-04-01T'));
  assert.notEqual(firstPage.items[0]?.id, secondPage.items[0]?.id);
});

test('HTTP API returns twenty threat intel rows from the incident pool', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/threat-intel?limit=20`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.sort, 'desc');
    assert.equal(body.total, MOCK_INCIDENTS.length);
    assert.equal(body.items.length, 20);
    assert.ok(body.items[0].occurredAt.startsWith('2026-04-26T'));
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('HTTP API supports ascending threat intel pagination', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/threat-intel?sort=asc&limit=20&offset=20`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.sort, 'asc');
    assert.equal(body.total, MOCK_INCIDENTS.length);
    assert.equal(body.items.length, 20);
    assert.ok(body.items[0].occurredAt >= '2026-04-01T00:00:00Z');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
