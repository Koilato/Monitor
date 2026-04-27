import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialFlowSchedule,
  FLOW_REPLAY_DELAY_MS,
  MAX_CONCURRENT_FLOW_STARTS,
  sortFlowPlaybackData,
} from '../../src/map/lib/flow-playback';
import type { BundledCanvasArcDatum } from '../../src/map/lib/arc-data';

function withArcSettings<T extends {
  bundleSpreadRatio: number;
  curvatureRatio: number;
  lineWidth: number;
  segmentCount: number;
  lengthPreset: 'short' | 'medium' | 'long';
}>(datum: T): T & {
  bundleCount: number;
  flightDuration: number;
  holdDuration: number;
  fadeoutDuration: number;
  replayDelayMs: number;
  bundleIntervalMs: number;
  maxConcurrentStarts: number;
  bundleSpreadRatio: number;
  curvatureRatio: number;
  lineWidth: number;
  segmentCount: number;
  style: {
    lineColor: string;
    ringColor: string;
    dotColor: string;
  };
  stages: {
    stage1: {
      lineAlpha: number;
      ringAlpha: number;
      dotAlpha: number;
      ringRadius: number;
      ringCount: number;
      ringSpacing: number;
      ringLineWidth: number;
      ringDotRadius: number;
    };
    stage2: {
      lineAlpha: number;
      ringAlpha: number;
      dotAlpha: number;
      ringRadius: number;
      ringCount: number;
      ringSpacing: number;
      ringLineWidth: number;
      ringDotRadius: number;
    };
    stage3: {
      lineAlpha: number;
      ringAlpha: number;
      dotAlpha: number;
      ringRadius: number;
      ringCount: number;
      ringSpacing: number;
      ringLineWidth: number;
      ringDotRadius: number;
    };
  };
  } {
  const stage = {
    lineAlpha: 1,
    ringAlpha: 1,
    dotAlpha: 1,
    ringRadius: 15,
    ringCount: 2,
    ringSpacing: 5,
    ringLineWidth: 2.5,
    ringDotRadius: 6,
  };

  return {
    ...datum,
    bundleCount: 'bundleCount' in datum && typeof datum.bundleCount === 'number' ? datum.bundleCount : 4,
    flightDuration: 1300,
    holdDuration: 2000,
    fadeoutDuration: 700,
    replayDelayMs: 5000,
    bundleIntervalMs: 220,
    maxConcurrentStarts: 4,
    bundleSpreadRatio: datum.bundleSpreadRatio,
    curvatureRatio: datum.curvatureRatio,
    lineWidth: datum.lineWidth,
    segmentCount: datum.segmentCount,
    style: {
      lineColor: '#123456',
      ringColor: '#234567',
      dotColor: '#345678',
    },
    stages: {
      stage1: { ...stage },
      stage2: { ...stage },
      stage3: { ...stage },
    },
  };
}

const FLOWS = [
  withArcSettings({
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
  }),
  withArcSettings({
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
  }),
  withArcSettings({
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
  }),
  withArcSettings({
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
  }),
  withArcSettings({
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
  }),
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

test('schedules start batches independently for each length preset', () => {
  const schedule = createInitialFlowSchedule(FLOWS, 'fifo', 1000);

  assert.equal(schedule.length, FLOWS.length);
  assert.equal(schedule[0]?.startAt, 1000);
  assert.equal(schedule[1]?.startAt, 1000);
  assert.equal(schedule[2]?.startAt, 1000);
  assert.equal(schedule[3]?.startAt, 1000);
  assert.equal(schedule[4]?.startAt, 1000);
});

test('keeps all bundles for the same flow in the same start batch', () => {
  const bundledFlows: BundledCanvasArcDatum[] = Array.from({ length: 5 }, (_, flowIndex) => {
    const bundleCount = 4;
    return Array.from({ length: bundleCount }, (_, bundleIndex) => withArcSettings({
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
    withArcSettings({
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
    }),
    withArcSettings({
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
    }),
    withArcSettings({
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
    }),
    withArcSettings({
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
    }),
    withArcSettings({
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
    }),
    withArcSettings({
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
    }),
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
