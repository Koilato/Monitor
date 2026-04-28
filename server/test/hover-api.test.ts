import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { buildCountryHoverResponse } from '../src/service.js';
import { buildAllFlowResponse } from '../src/service.js';
import { buildLatestContentResponse } from '../src/service.js';
import { buildThreatMapResponse } from '../src/service.js';
import { MOCK_INCIDENTS } from '../src/mock-incidents.js';
import { MOCK_LATEST_CONTENT } from '../src/mock-feed.js';
import { validateMockFeed, validateMockIncidents } from '../src/mock-validation.js';
import { createApp } from '../src/app.js';

test('CN hover response includes the added China-targeted incidents', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'CN',
    startDate: null,
    endDate: null,
  });

  assert.equal(result.total, 23);
  assert.deepEqual(
    result.flows.map((flow) => `${flow.attackerCountry}:${flow.count}`),
    ['IT:12', 'JP:5', 'US:5', 'RU:1'],
  );
});

test('mock datasets pass runtime validation', () => {
  assert.doesNotThrow(() => validateMockIncidents(MOCK_INCIDENTS));
  assert.doesNotThrow(() => validateMockFeed(MOCK_LATEST_CONTENT));
  assert.equal(MOCK_INCIDENTS.length, 223);
  assert.equal(MOCK_INCIDENTS[0]?.date, '2026-04-01');
  assert.equal(MOCK_INCIDENTS.at(-1)?.date, '2026-04-26');
});

test('US hover response returns 2 incidents with CN flow', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'US',
    startDate: null,
    endDate: null,
  });

  assert.equal(result.total, 15);
  assert.deepEqual(
    result.flows.map((flow) => `${flow.attackerCountry}:${flow.count}`),
    ['IN:13', 'CN:2'],
  );
});

test('date range filter applies as a closed interval', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'CN',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
  });

  assert.equal(result.total, 7);
  assert.deepEqual(
    result.incidents.map((incident) => incident.uuid),
    ['mock-003', 'mock-004', 'mock-005', 'mock-006', 'mock-047', 'mock-063', 'mock-079'],
  );
  assert.ok(result.incidents.every((incident) => incident.date >= '2026-04-03' && incident.date <= '2026-04-06'));
});

test('today range returns the mock China incidents', () => {
  const threatMap = buildThreatMapResponse(MOCK_INCIDENTS, {
    startDate: '2026-04-19',
    endDate: '2026-04-19',
  });

  assert.equal(threatMap.total, 11);
  assert.deepEqual(
    threatMap.countries.map((country) => `${country.country}:${country.eventLevel}:${country.incidentCount}`),
    ['CN:high:3', 'DK:high:2', 'CA:high:1', 'ES:high:1', 'NL:high:1', 'DE:medium:1', 'FR:low:1', 'JP:low:1'],
  );
});

test('today hover range returns the China mock incidents', () => {
  const result = buildCountryHoverResponse(MOCK_INCIDENTS, {
    victimCountry: 'CN',
    startDate: '2026-04-19',
    endDate: '2026-04-19',
  });

  assert.equal(result.total, 3);
  assert.deepEqual(
    result.incidents.map((incident) => incident.uuid),
    ['mock-019a', 'mock-019b', 'mock-019c'],
  );
});

test('all-flow response returns distinct lines with date metadata', () => {
  const result = buildAllFlowResponse(MOCK_INCIDENTS, {
    startDate: '2026-04-01',
    endDate: '2026-04-22',
  });

  assert.equal(result.total, result.flows.length);
  assert.equal(result.total, 29);
  assert.equal(result.flows[0]?.attackerCountry, 'DE');
  assert.equal(result.flows[0]?.victimCountry, 'GB');
  assert.equal(result.flows[0]?.count, 11);
  assert.equal(result.flows[0]?.firstDate, '2026-04-01');
  assert.equal(result.flows[0]?.lastDate, '2026-04-22');
  assert.equal(result.flows.find((flow) => flow.attackerCountry === 'US' && flow.victimCountry === 'CN')?.count, 5);
  assert.equal(result.flows.find((flow) => flow.attackerCountry === 'CN' && flow.victimCountry === 'US')?.count, 2);
});

test('threat map uses the highest incident severity as country event level', () => {
  const threatMap = buildThreatMapResponse(MOCK_INCIDENTS, {
    startDate: '2026-04-01',
    endDate: '2026-04-03',
  });

  assert.deepEqual(
    threatMap.countries.map((country) => `${country.country}:${country.eventLevel}`),
    ['CN:high', 'AU:high', 'CA:high', 'ES:high', 'NL:high', 'US:high', 'BE:medium', 'DE:medium', 'DK:medium', 'GB:medium', 'NO:medium', 'SG:medium', 'JP:low', 'FR:low', 'IT:low', 'SE:low'],
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
  assert.equal(body.error, '必须是有效的两位国家代码');

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

test('threat map response changes with the selected date range', () => {
  const earlyRange = buildThreatMapResponse(MOCK_INCIDENTS, {
    startDate: '2026-04-01',
    endDate: '2026-04-04',
  });

  assert.equal(earlyRange.total, 47);
  assert.deepEqual(
    earlyRange.countries.map((country) => `${country.country}:${country.eventLevel}:${country.incidentCount}`),
    ['CN:high:7', 'AU:high:3', 'CA:high:3', 'US:high:3', 'ES:high:2', 'NL:high:2', 'BE:medium:3', 'DE:medium:3', 'GB:medium:3', 'NO:medium:3', 'DK:medium:2', 'SG:medium:2', 'IT:low:3', 'JP:low:3', 'SE:low:3', 'FR:low:2'],
  );

  const laterRange = buildThreatMapResponse(MOCK_INCIDENTS, {
    startDate: '2026-04-01',
    endDate: '2026-04-08',
  });

  assert.equal(laterRange.total, 84);
  assert.deepEqual(
    laterRange.countries.map((country) => `${country.country}:${country.eventLevel}:${country.incidentCount}`),
    ['CN:high:13', 'AU:high:5', 'CA:high:5', 'US:high:5', 'ES:high:4', 'NL:high:4', 'BE:medium:5', 'DE:medium:5', 'GB:medium:5', 'NO:medium:5', 'SG:medium:5', 'DK:medium:4', 'IT:low:5', 'JP:low:5', 'SE:low:5', 'FR:low:4'],
  );
});

test('HTTP API returns threat map data for the selected date range', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/map/threat-map?startDate=2026-04-01&endDate=2026-04-08`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.total, 84);
    assert.deepEqual(
      body.countries.map((country: { country: string; eventLevel: string; incidentCount: number }) => `${country.country}:${country.eventLevel}:${country.incidentCount}`),
      ['CN:high:13', 'AU:high:5', 'CA:high:5', 'US:high:5', 'ES:high:4', 'NL:high:4', 'BE:medium:5', 'DE:medium:5', 'GB:medium:5', 'NO:medium:5', 'SG:medium:5', 'DK:medium:4', 'IT:low:5', 'JP:low:5', 'SE:low:5', 'FR:low:4'],
    );
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('HTTP API returns all-flow data for the selected date range', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/map/all-flows?startDate=2026-04-01&endDate=2026-04-22`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.total, 29);
    assert.equal(body.total, body.flows.length);
    assert.equal(body.flows[0]?.attackerCountry, 'DE');
    assert.equal(body.flows[0]?.victimCountry, 'GB');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('HTTP API rejects invalid threat map date ranges', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get dynamic port');
  }

  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/map/threat-map?startDate=2026-04-10&endDate=2026-04-05`,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, '开始日期必须早于或等于结束日期');

  server.close();
  await once(server, 'close');
});

test('HTTP API rejects impossible calendar dates', async () => {
  const server = createServer(createApp());
  server.listen(0);
  await once(server, 'listening');

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get dynamic port');
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/map/threat-map?startDate=2026-02-31&endDate=2026-02-31`,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, '必须是有效的日期');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
