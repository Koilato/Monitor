import type { HoverFlow, ThreatMapResponse } from '@shared/types';

import { getCountryCentroid } from 'map/lib/country-geometry';
import { resolveThreatVisualLevel, type ThreatVisualLevel } from 'map/layers/tokens';
import type {
  ArcLengthPreset,
  AttackArcDebugSettings,
  AttackArcLengthPresetSettings,
  AttackArcLengthThresholds,
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
}

export interface CanvasArcDatum extends ArcGeometryPreset {
  id: string;
  flowKey: string;
  source: [number, number];
  target: [number, number];
  count: number;
  visualLevel: ThreatVisualLevel;
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

function resolveBundleEndpointOffset(
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
  bundleOffset: number,
  bundleSpreadRatio: number,
): { source: [number, number]; target: [number, number] } {
  const [offsetX, offsetY] = resolveBundleEndpointOffset(source, target, bundleOffset, bundleSpreadRatio);
  return {
    source: [source[0] + offsetX, source[1] + offsetY],
    target: [target[0] + offsetX, target[1] + offsetY],
  };
}

function resolveBundleArrowPosition(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
  bundleSpreadRatio: number,
): [number, number] {
  const endpoints = resolveBundledArcEndpoints(source, target, bundleOffset, bundleSpreadRatio);
  return interpolatePosition(endpoints.source, endpoints.target, 0.975);
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
  threatData: ThreatMapResponse | null,
  activeThreatCountryCodes: readonly string[],
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

    const sourcePosition: [number, number] = [source.lon, source.lat];
    const targetPosition: [number, number] = [target.lon, target.lat];
    const distance = resolveFlowDistance(sourcePosition, targetPosition);
    const lengthPreset = resolveArcLengthPreset(distance, arcSettings.lengthThresholds);
    const geometryPreset: AttackArcLengthPresetSettings = arcSettings.lengthPresets[lengthPreset];

    return {
      flowKey: getFlowKey(flow.attackerCountry, flow.victimCountry),
      sourcePosition,
      targetPosition,
      distance,
      lengthPreset,
      bundleSpreadRatio: geometryPreset.bundleSpreadRatio,
      curvatureRatio: geometryPreset.curvatureRatio,
      lineWidth: geometryPreset.lineWidth,
      segmentCount: geometryPreset.segmentCount,
      visualLevel: resolveThreatVisualLevel(
        threatData?.countries.find((country) => country.country === flow.victimCountry)?.eventLevel ?? 'low',
        flow.victimCountry,
        activeThreatCountryCodes,
      ),
    };
  }));
}

function expandBundledArcData<T>(
  resolvedFlows: Array<ResolvedArcFlow | null>,
  flowData: FlowArcSource,
  bundleCount: number,
  buildDatum: (args: {
    flow: HoverFlow;
    resolvedFlow: ResolvedArcFlow;
    bundleIndex: number;
    bundleCount: number;
    bundleOffset: number;
    bundledEndpoints: { source: [number, number]; target: [number, number] };
  }) => T,
): T[] {
  const bundledMeta = createBundledArcMeta(bundleCount);
  const rows = resolvedFlows.map((resolvedFlow, flowIndex) => {
    const flow = flowData.flows[flowIndex];
    if (!resolvedFlow || !flow) {
      return null;
    }

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
  threatData: ThreatMapResponse | null,
  activeThreatCountryCodes: readonly string[],
  arcSettings: AttackArcDebugSettings,
): Promise<BundledTwoDArcDatum[]> {
  if (!data) {
    return [];
  }

  const resolvedFlows = await resolveBundledArcFlows(
    data,
    threatData,
    activeThreatCountryCodes,
    arcSettings,
  );

  return expandBundledArcData(resolvedFlows, data, arcSettings.bundleCount, ({
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
    angle: getBearing(bundledEndpoints.source, bundledEndpoints.target),
    visualLevel: resolvedFlow.visualLevel,
    distance: resolvedFlow.distance,
    lengthPreset: resolvedFlow.lengthPreset,
    bundleSpreadRatio: resolvedFlow.bundleSpreadRatio,
    curvatureRatio: resolvedFlow.curvatureRatio,
    lineWidth: resolvedFlow.lineWidth,
    segmentCount: resolvedFlow.segmentCount,
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}

export async function buildCanvasArcData(
  data: FlowArcSource | null,
  threatData: ThreatMapResponse | null,
  activeThreatCountryCodes: readonly string[],
  arcSettings: AttackArcDebugSettings,
): Promise<BundledCanvasArcDatum[]> {
  if (!data) {
    return [];
  }

  const resolvedFlows = await resolveBundledArcFlows(
    data,
    threatData,
    activeThreatCountryCodes,
    arcSettings,
  );

  return expandBundledArcData(resolvedFlows, data, arcSettings.bundleCount, ({
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
    attackerCountry: flow.attackerCountry,
    victimCountry: flow.victimCountry,
    firstDate: flow.firstDate ?? null,
    lastDate: flow.lastDate ?? null,
    distance: resolvedFlow.distance,
    lengthPreset: resolvedFlow.lengthPreset,
    bundleSpreadRatio: resolvedFlow.bundleSpreadRatio,
    curvatureRatio: resolvedFlow.curvatureRatio,
    lineWidth: resolvedFlow.lineWidth,
    segmentCount: resolvedFlow.segmentCount,
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}
