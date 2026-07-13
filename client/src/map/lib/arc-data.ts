import type { HoverFlow } from '@shared/types';

import { getCountryCentroid } from 'map/lib/country-geometry';
import { resolveThreatVisualLevel, type ThreatVisualLevel } from 'map/layers/tokens';
import type { EventLevel } from '@shared/types';
import { normalizeWorldPosition } from 'map/lib/world-overview';
import type {
  ArcLengthPreset,
  AttackArcStagePreset,
  AttackArcResolvedStageSettings,
  AttackArcDebugSettings,
  AttackArcLengthPresetSettings,
  AttackArcLengthThresholds,
  AttackArcVisualStyle,
} from 'map/state/map-types';

export interface FlowArcSource {
  flows: HoverFlow[];
}

export interface ArcBundleMeta {
  bundleIndex: number;
  bundleCount: number;
  bundleOffset: number;
}

export interface ArcGeometryPreset extends AttackArcLengthPresetSettings {
  distance: number;
  lengthPreset: ArcLengthPreset;
}

export interface TwoDArcDatum extends ArcGeometryPreset {
  id: string;
  flowKey: string;
  source: [number, number];
  target: [number, number];
  arrowPosition: [number, number];
  label: string;
  count: number;
  angle: number;
  visualLevel: ThreatVisualLevel;
  visualStyle: AttackArcVisualStyle;
}

export interface CanvasArcDatum extends ArcGeometryPreset {
  id: string;
  flowKey: string;
  source: [number, number];
  target: [number, number];
  count: number;
  visualLevel: ThreatVisualLevel;
  visualStyle: AttackArcVisualStyle;
  attackerCountry: string;
  victimCountry: string;
  firstDate: string | null;
  lastDate: string | null;
}

export type BundledTwoDArcDatum = TwoDArcDatum & ArcBundleMeta;
export type BundledCanvasArcDatum = CanvasArcDatum & ArcBundleMeta;

interface ResolvedArcFlow extends ArcGeometryPreset {
  flowKey: string;
  sourcePosition: [number, number];
  targetPosition: [number, number];
  visualLevel: ThreatVisualLevel;
  visualStyle: AttackArcDebugSettings['visualStyles'][EventLevel];
}

export function resolveArcStageSettings(
  settings: AttackArcLengthPresetSettings,
  stage: AttackArcStagePreset,
  style: AttackArcVisualStyle,
): AttackArcResolvedStageSettings {
  return {
    ...settings.stages[stage],
    lineColor: style.lineColor,
    ringColor: style.ringColor,
    dotColor: style.dotColor,
    bundleSpreadRatio: settings.bundleSpreadRatio,
    curvatureRatio: settings.curvatureRatio,
    lineWidth: settings.lineWidth,
    segmentCount: settings.segmentCount,
  };
}

function getBearing(source: [number, number], target: [number, number]): number {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function interpolatePosition(
  source: [number, number],
  target: [number, number],
  t: number,
): [number, number] {
  return [
    source[0] + ((target[0] - source[0]) * t),
    source[1] + ((target[1] - source[1]) * t),
  ];
}

function getBundleOffsets(bundleCount: number): number[] {
  return Array.from({ length: bundleCount }, (_, index) => index - ((bundleCount - 1) / 2));
}

function getFlowKey(attackerCountry: string, victimCountry: string): string {
  return `${attackerCountry}->${victimCountry}`;
}

function resolveFlowDistance(source: [number, number], target: [number, number]): number {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  return Math.hypot(dx, dy);
}

export function resolveArcLengthPreset(
  distance: number,
  thresholds: AttackArcLengthThresholds,
): ArcLengthPreset {
  if (distance <= thresholds.shortMax) {
    return 'short';
  }

  if (distance <= thresholds.mediumMax) {
    return 'medium';
  }

  return 'long';
}

function resolveBundleLateralOffset(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
  bundleSpreadRatio: number,
): [number, number] {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  const length = Math.hypot(dx, dy) || 1;

  let normalX = -dy / length;
  let normalY = dx / length;
  if (normalY > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  const spread = Math.max(0.35, Math.min(4, length * bundleSpreadRatio));
  const offset = spread * bundleOffset;
  return [normalX * offset, normalY * offset];
}

export function resolveBundledArcEndpoints(
  source: [number, number],
  target: [number, number],
  _bundleOffset: number,
  _bundleSpreadRatio: number,
): { source: [number, number]; target: [number, number] } {
  return {
    source,
    target,
  };
}

function resolveBundleArrowPosition(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
  bundleSpreadRatio: number,
): [number, number] {
  const basePoint = interpolatePosition(source, target, 0.975);
  const [offsetX, offsetY] = resolveBundleLateralOffset(source, target, bundleOffset, bundleSpreadRatio);
  return [basePoint[0] + offsetX, basePoint[1] + offsetY];
}

function createBundledArcMeta(bundleCount: number): ArcBundleMeta[] {
  return getBundleOffsets(bundleCount).map((bundleOffset, bundleIndex) => ({
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}

async function resolveBundledArcFlows(
  data: FlowArcSource | null,
  arcSettings: AttackArcDebugSettings,
): Promise<Array<ResolvedArcFlow | null>> {
  if (!data) {
    return [];
  }

  return Promise.all(data.flows.map(async (flow) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    const target = await getCountryCentroid(flow.victimCountry);
    if (!source || !target) {
      return null;
    }

    const sourcePosition = normalizeWorldPosition([source.lon, source.lat]);
    const targetPosition = normalizeWorldPosition([target.lon, target.lat]);
    const distance = resolveFlowDistance(sourcePosition, targetPosition);
    const lengthPreset = resolveArcLengthPreset(distance, arcSettings.lengthThresholds);
    const geometryPreset: AttackArcLengthPresetSettings = arcSettings.presets[lengthPreset];
    const eventLevel: EventLevel = flow.flowLevel;
    return {
      flowKey: getFlowKey(flow.attackerCountry, flow.victimCountry),
      sourcePosition,
      targetPosition,
      distance,
      lengthPreset,
      bundleCount: geometryPreset.bundleCount,
      flightDuration: geometryPreset.flightDuration,
      holdDuration: geometryPreset.holdDuration,
      fadeoutDuration: geometryPreset.fadeoutDuration,
      replayDelayMs: geometryPreset.replayDelayMs,
      bundleIntervalMs: geometryPreset.bundleIntervalMs,
      maxConcurrentStarts: geometryPreset.maxConcurrentStarts,
      bundleSpreadRatio: geometryPreset.bundleSpreadRatio,
      curvatureRatio: geometryPreset.curvatureRatio,
      lineWidth: geometryPreset.lineWidth,
      segmentCount: geometryPreset.segmentCount,
      curveType: geometryPreset.curveType,
      pathSamplingCount: geometryPreset.pathSamplingCount,
      minArcHeightPx: geometryPreset.minArcHeightPx,
      maxArcHeightPx: geometryPreset.maxArcHeightPx,
      arcHeightRatio: geometryPreset.arcHeightRatio,
      controlInsetRatio: geometryPreset.controlInsetRatio,
      lengthBasedProgress: geometryPreset.lengthBasedProgress,
      bundleMode: geometryPreset.bundleMode,
      bundleHeightStepPx: geometryPreset.bundleHeightStepPx,
      bundleAlphaStep: geometryPreset.bundleAlphaStep,
      dedupeTargetRings: geometryPreset.dedupeTargetRings,
      stages: geometryPreset.stages,
      visualLevel: resolveThreatVisualLevel(eventLevel),
      visualStyle: arcSettings.visualStyles[eventLevel],
    };
  }));
}

function expandBundledArcData<T>(
  resolvedFlows: Array<ResolvedArcFlow | null>,
  flowData: FlowArcSource,
  buildDatum: (args: {
    flow: HoverFlow;
    resolvedFlow: ResolvedArcFlow;
    bundleIndex: number;
    bundleCount: number;
    bundleOffset: number;
    bundledEndpoints: { source: [number, number]; target: [number, number] };
  }) => T,
): T[] {
  const rows = resolvedFlows.map((resolvedFlow, flowIndex) => {
    const flow = flowData.flows[flowIndex];
    if (!resolvedFlow || !flow) {
      return null;
    }

    const bundledMeta = createBundledArcMeta(resolvedFlow.bundleCount);
    return bundledMeta.map(({ bundleIndex, bundleCount: nextBundleCount, bundleOffset }) => {
      const bundledEndpoints = resolveBundledArcEndpoints(
        resolvedFlow.sourcePosition,
        resolvedFlow.targetPosition,
        bundleOffset,
        resolvedFlow.bundleSpreadRatio,
      );

      return buildDatum({
        flow,
        resolvedFlow,
        bundleIndex,
        bundleCount: nextBundleCount,
        bundleOffset,
        bundledEndpoints,
      });
    });
  });

  return rows.flatMap((row): T[] => row ?? []);
}

export async function buildTwoDArcData(
  data: FlowArcSource | null,
  arcSettings: AttackArcDebugSettings,
): Promise<BundledTwoDArcDatum[]> {
  if (!data) {
    return [];
  }

  const resolvedFlows = await resolveBundledArcFlows(
    data,
    arcSettings,
  );

  return expandBundledArcData(resolvedFlows, data, ({
    flow,
    resolvedFlow,
    bundleIndex,
    bundleCount,
    bundleOffset,
    bundledEndpoints,
  }) => ({
    id: `${flow.attackerCountry}-${flow.victimCountry}-${bundleIndex}`,
    flowKey: resolvedFlow.flowKey,
    source: resolvedFlow.sourcePosition,
    target: resolvedFlow.targetPosition,
    arrowPosition: resolveBundleArrowPosition(
      resolvedFlow.sourcePosition,
      resolvedFlow.targetPosition,
      bundleOffset,
      resolvedFlow.bundleSpreadRatio,
    ),
    label: `${flow.attackerCountry} → ${flow.victimCountry}`,
    count: flow.count,
    angle: getBearing(resolvedFlow.sourcePosition, resolvedFlow.targetPosition),
    visualLevel: resolvedFlow.visualLevel,
    visualStyle: resolvedFlow.visualStyle,
    distance: resolvedFlow.distance,
    lengthPreset: resolvedFlow.lengthPreset,
    flightDuration: resolvedFlow.flightDuration,
    holdDuration: resolvedFlow.holdDuration,
    fadeoutDuration: resolvedFlow.fadeoutDuration,
    replayDelayMs: resolvedFlow.replayDelayMs,
    bundleIntervalMs: resolvedFlow.bundleIntervalMs,
    maxConcurrentStarts: resolvedFlow.maxConcurrentStarts,
    stages: resolvedFlow.stages,
    bundleSpreadRatio: resolvedFlow.bundleSpreadRatio,
    curvatureRatio: resolvedFlow.curvatureRatio,
    lineWidth: resolvedFlow.lineWidth,
    segmentCount: resolvedFlow.segmentCount,
    curveType: resolvedFlow.curveType,
    pathSamplingCount: resolvedFlow.pathSamplingCount,
    minArcHeightPx: resolvedFlow.minArcHeightPx,
    maxArcHeightPx: resolvedFlow.maxArcHeightPx,
    arcHeightRatio: resolvedFlow.arcHeightRatio,
    controlInsetRatio: resolvedFlow.controlInsetRatio,
    lengthBasedProgress: resolvedFlow.lengthBasedProgress,
    bundleMode: resolvedFlow.bundleMode,
    bundleHeightStepPx: resolvedFlow.bundleHeightStepPx,
    bundleAlphaStep: resolvedFlow.bundleAlphaStep,
    dedupeTargetRings: resolvedFlow.dedupeTargetRings,
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}

export async function buildCanvasArcData(
  data: FlowArcSource | null,
  arcSettings: AttackArcDebugSettings,
): Promise<BundledCanvasArcDatum[]> {
  if (!data) {
    return [];
  }

  const resolvedFlows = await resolveBundledArcFlows(
    data,
    arcSettings,
  );

  return expandBundledArcData(resolvedFlows, data, ({
    flow,
    resolvedFlow,
    bundleIndex,
    bundleCount,
    bundleOffset,
  }) => ({
    id: `${flow.attackerCountry}-${flow.victimCountry}-${bundleIndex}`,
    flowKey: resolvedFlow.flowKey,
    source: resolvedFlow.sourcePosition,
    target: resolvedFlow.targetPosition,
    count: flow.count,
    visualLevel: resolvedFlow.visualLevel,
    visualStyle: resolvedFlow.visualStyle,
    attackerCountry: flow.attackerCountry,
    victimCountry: flow.victimCountry,
    firstDate: flow.firstDate ?? null,
    lastDate: flow.lastDate ?? null,
    distance: resolvedFlow.distance,
    lengthPreset: resolvedFlow.lengthPreset,
    flightDuration: resolvedFlow.flightDuration,
    holdDuration: resolvedFlow.holdDuration,
    fadeoutDuration: resolvedFlow.fadeoutDuration,
    replayDelayMs: resolvedFlow.replayDelayMs,
    bundleIntervalMs: resolvedFlow.bundleIntervalMs,
    maxConcurrentStarts: resolvedFlow.maxConcurrentStarts,
    stages: resolvedFlow.stages,
    bundleSpreadRatio: resolvedFlow.bundleSpreadRatio,
    curvatureRatio: resolvedFlow.curvatureRatio,
    lineWidth: resolvedFlow.lineWidth,
    segmentCount: resolvedFlow.segmentCount,
    curveType: resolvedFlow.curveType,
    pathSamplingCount: resolvedFlow.pathSamplingCount,
    minArcHeightPx: resolvedFlow.minArcHeightPx,
    maxArcHeightPx: resolvedFlow.maxArcHeightPx,
    arcHeightRatio: resolvedFlow.arcHeightRatio,
    controlInsetRatio: resolvedFlow.controlInsetRatio,
    lengthBasedProgress: resolvedFlow.lengthBasedProgress,
    bundleMode: resolvedFlow.bundleMode,
    bundleHeightStepPx: resolvedFlow.bundleHeightStepPx,
    bundleAlphaStep: resolvedFlow.bundleAlphaStep,
    dedupeTargetRings: resolvedFlow.dedupeTargetRings,
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}
