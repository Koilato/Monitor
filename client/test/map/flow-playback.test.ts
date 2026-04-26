import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialFlowSchedule,
  FLOW_REPLAY_DELAY_MS,
  MAX_CONCURRENT_FLOW_STARTS,
  sortFlowPlaybackData,
} from '../../src/map/lib/flow-playback';

const FLOWS = [
  {
    id: 'a',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'US',
    victimCountry: 'CN',
    firstDate: '2026-04-03',
    lastDate: '2026-04-05',
  },
  {
    id: 'b',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'JP',
    victimCountry: 'CN',
    firstDate: '2026-04-01',
    lastDate: '2026-04-02',
  },
  {
    id: 'c',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'DE',
    victimCountry: 'FR',
    firstDate: '2026-04-02',
    lastDate: '2026-04-04',
  },
  {
    id: 'd',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'DE',
    victimCountry: 'GB',
    firstDate: '2026-04-01',
    lastDate: '2026-04-01',
  },
  {
    id: 'e',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'KR',
    victimCountry: 'SG',
    firstDate: '2026-04-04',
    lastDate: '2026-04-04',
  },
];

test('sorts playback data by country and time modes', () => {
  assert.deepEqual(
    sortFlowPlaybackData(FLOWS, 'country').map((flow) => flow.id),
    ['c', 'd', 'b', 'e', 'a'],
  );

  assert.deepEqual(
    sortFlowPlaybackData(FLOWS, 'time').map((flow) => flow.id),
    ['b', 'd', 'c', 'a', 'e'],
  );
});

test('creates staggered batches of four flow starts', () => {
  const schedule = createInitialFlowSchedule(FLOWS, 'fifo', 1000);

  assert.equal(schedule.length, FLOWS.length);
  assert.equal(schedule[0]?.startAt, 1000);
  assert.equal(schedule[1]?.startAt, 1000);
  assert.equal(schedule[2]?.startAt, 1000);
  assert.equal(schedule[3]?.startAt, 1000);
  assert.equal(schedule[4]?.startAt, 1220);
});

test('replay delay is configured at five seconds', () => {
  assert.equal(FLOW_REPLAY_DELAY_MS, 5000);
  assert.equal(MAX_CONCURRENT_FLOW_STARTS, 4);
});
