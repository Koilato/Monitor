import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialFlowSchedule,
  FLOW_REPLAY_DELAY_MS,
  MAX_CONCURRENT_FLOW_STARTS,
  sortFlowPlaybackData,
} from '../../src/map/lib/flow-playback';
import type { BundledCanvasArcDatum } from '../../src/map/lib/arc-data';

const FLOWS = [
  {
    id: 'a',
    flowKey: 'US->CN',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'US',
    victimCountry: 'CN',
    firstDate: '2026-04-03',
    lastDate: '2026-04-05',
    distance: 120,
    lengthPreset: 'long' as const,
    bundleSpreadRatio: 0.12,
    curvatureRatio: 0.24,
    lineWidth: 2.2,
    segmentCount: 140,
  },
  {
    id: 'b',
    flowKey: 'JP->CN',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'JP',
    victimCountry: 'CN',
    firstDate: '2026-04-01',
    lastDate: '2026-04-02',
    distance: 12,
    lengthPreset: 'short' as const,
    bundleSpreadRatio: 0.05,
    curvatureRatio: 0.08,
    lineWidth: 1.5,
    segmentCount: 64,
  },
  {
    id: 'c',
    flowKey: 'DE->FR',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'DE',
    victimCountry: 'FR',
    firstDate: '2026-04-02',
    lastDate: '2026-04-04',
    distance: 8,
    lengthPreset: 'short' as const,
    bundleSpreadRatio: 0.05,
    curvatureRatio: 0.08,
    lineWidth: 1.5,
    segmentCount: 64,
  },
  {
    id: 'd',
    flowKey: 'DE->GB',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'DE',
    victimCountry: 'GB',
    firstDate: '2026-04-01',
    lastDate: '2026-04-01',
    distance: 16,
    lengthPreset: 'short' as const,
    bundleSpreadRatio: 0.05,
    curvatureRatio: 0.08,
    lineWidth: 1.5,
    segmentCount: 64,
  },
  {
    id: 'e',
    flowKey: 'KR->SG',
    source: [0, 0] as [number, number],
    target: [1, 1] as [number, number],
    count: 1,
    visualLevel: 'low' as const,
    attackerCountry: 'KR',
    victimCountry: 'SG',
    firstDate: '2026-04-04',
    lastDate: '2026-04-04',
    distance: 44,
    lengthPreset: 'medium' as const,
    bundleSpreadRatio: 0.08,
    curvatureRatio: 0.16,
    lineWidth: 1.8,
    segmentCount: 100,
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

test('keeps all bundles for the same flow in the same start batch', () => {
  const bundledFlows: BundledCanvasArcDatum[] = Array.from({ length: 5 }, (_, flowIndex) => {
    const bundleCount = 4;
    return Array.from({ length: bundleCount }, (_, bundleIndex) => ({
      id: `flow-${flowIndex}-${bundleIndex}`,
      flowKey: `A${flowIndex}->B${flowIndex}`,
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 1,
      visualLevel: 'low' as const,
      attackerCountry: `A${flowIndex}`,
      victimCountry: `B${flowIndex}`,
      firstDate: null,
      lastDate: null,
      distance: 24,
      lengthPreset: 'medium' as const,
      bundleSpreadRatio: 0.08,
      curvatureRatio: 0.16,
      lineWidth: 1.8,
      segmentCount: 100,
      bundleIndex,
      bundleCount,
      bundleOffset: bundleIndex - 1.5,
    }));
  }).flat();

  const schedule = createInitialFlowSchedule(bundledFlows, 'fifo', 1000);

  assert.equal(schedule.length, 20);
  assert.equal(schedule[0]?.startAt, 1000);
  assert.equal(schedule[3]?.startAt, 1000);
  assert.equal(schedule[4]?.startAt, 1000);
  assert.equal(schedule[15]?.startAt, 1000);
  assert.equal(schedule[16]?.startAt, 1220);
  assert.equal(schedule[19]?.startAt, 1220);
});

test('keeps bundle groups intact across playback modes', () => {
  const bundledFlows: BundledCanvasArcDatum[] = [
    {
      id: 'us-cn-0',
      flowKey: 'US->CN',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'US',
      victimCountry: 'CN',
      firstDate: '2026-04-03',
      lastDate: '2026-04-05',
      distance: 120,
      lengthPreset: 'long' as const,
      bundleSpreadRatio: 0.12,
      curvatureRatio: 0.24,
      lineWidth: 2.2,
      segmentCount: 140,
      bundleIndex: 0,
      bundleCount: 2,
      bundleOffset: -0.5,
    },
    {
      id: 'us-cn-1',
      flowKey: 'US->CN',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'US',
      victimCountry: 'CN',
      firstDate: '2026-04-03',
      lastDate: '2026-04-05',
      distance: 120,
      lengthPreset: 'long' as const,
      bundleSpreadRatio: 0.12,
      curvatureRatio: 0.24,
      lineWidth: 2.2,
      segmentCount: 140,
      bundleIndex: 1,
      bundleCount: 2,
      bundleOffset: 0.5,
    },
    {
      id: 'jp-cn-0',
      flowKey: 'JP->CN',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'JP',
      victimCountry: 'CN',
      firstDate: '2026-04-01',
      lastDate: '2026-04-02',
      distance: 12,
      lengthPreset: 'short' as const,
      bundleSpreadRatio: 0.05,
      curvatureRatio: 0.08,
      lineWidth: 1.5,
      segmentCount: 64,
      bundleIndex: 0,
      bundleCount: 2,
      bundleOffset: -0.5,
    },
    {
      id: 'jp-cn-1',
      flowKey: 'JP->CN',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'JP',
      victimCountry: 'CN',
      firstDate: '2026-04-01',
      lastDate: '2026-04-02',
      distance: 12,
      lengthPreset: 'short' as const,
      bundleSpreadRatio: 0.05,
      curvatureRatio: 0.08,
      lineWidth: 1.5,
      segmentCount: 64,
      bundleIndex: 1,
      bundleCount: 2,
      bundleOffset: 0.5,
    },
    {
      id: 'de-fr-0',
      flowKey: 'DE->FR',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'DE',
      victimCountry: 'FR',
      firstDate: '2026-04-02',
      lastDate: '2026-04-04',
      distance: 8,
      lengthPreset: 'short' as const,
      bundleSpreadRatio: 0.05,
      curvatureRatio: 0.08,
      lineWidth: 1.5,
      segmentCount: 64,
      bundleIndex: 0,
      bundleCount: 2,
      bundleOffset: -0.5,
    },
    {
      id: 'de-fr-1',
      flowKey: 'DE->FR',
      source: [0, 0] as [number, number],
      target: [1, 1] as [number, number],
      count: 2,
      visualLevel: 'low' as const,
      attackerCountry: 'DE',
      victimCountry: 'FR',
      firstDate: '2026-04-02',
      lastDate: '2026-04-04',
      distance: 8,
      lengthPreset: 'short' as const,
      bundleSpreadRatio: 0.05,
      curvatureRatio: 0.08,
      lineWidth: 1.5,
      segmentCount: 64,
      bundleIndex: 1,
      bundleCount: 2,
      bundleOffset: 0.5,
    },
  ];

  for (const mode of ['fifo', 'country', 'time'] as const) {
    const schedule = createInitialFlowSchedule(bundledFlows, mode, 1000);

    assert.equal(schedule.length, 6);
    const byFlow = new Map<string, number[]>();
    for (const datum of schedule) {
      const times = byFlow.get(datum.flowKey) ?? [];
      times.push(datum.startAt);
      byFlow.set(datum.flowKey, times);
    }

    assert.deepEqual([...byFlow.values()].map((times) => new Set(times).size), [1, 1, 1]);
    assert.deepEqual([...byFlow.values()].map((times) => times.length), [2, 2, 2]);
  }
});

test('replay delay is configured at five seconds', () => {
  assert.equal(FLOW_REPLAY_DELAY_MS, 5000);
  assert.equal(MAX_CONCURRENT_FLOW_STARTS, 4);
});
