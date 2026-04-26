import type { ThreatMapResponse, HoverFlow } from '@shared/types';

import { getCountryCentroid } from 'map/lib/country-geometry';
import { resolveThreatVisualLevel, type ThreatVisualLevel } from 'map/layers/tokens';

const ARC_BUNDLE_COUNT = 4;
const ARC_BUNDLE_SPREAD_RATIO = 0.08;

export interface TwoDArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  arrowPosition: [number, number];
  label: string;
  count: number;
  angle: number;
  visualLevel: ThreatVisualLevel;
}

export interface FlowArcSource {
  flows: HoverFlow[];
}

export interface ArcBundleMeta {
  bundleIndex: number;
  bundleCount: number;
  bundleOffset: number;
}

export type BundledTwoDArcDatum = TwoDArcDatum & ArcBundleMeta;
export type BundledCanvasArcDatum = CanvasArcDatum & ArcBundleMeta;

export interface CanvasArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  count: number;
  visualLevel: ThreatVisualLevel;
  attackerCountry: string;
  victimCountry: string;
  firstDate: string | null;
  lastDate: string | null;
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

function resolveBundleEndpointOffset(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
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

  const spread = Math.max(0.35, Math.min(4, length * ARC_BUNDLE_SPREAD_RATIO));
  const offset = spread * bundleOffset;
  return [
    normalX * offset,
    normalY * offset,
  ];
}

export function resolveBundledArcEndpoints(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
): {
  source: [number, number];
  target: [number, number];
} {
  const [offsetX, offsetY] = resolveBundleEndpointOffset(source, target, bundleOffset);
  return {
    source: [source[0] + offsetX, source[1] + offsetY],
    target: [target[0] + offsetX, target[1] + offsetY],
  };
}

function resolveBundleArrowPosition(
  source: [number, number],
  target: [number, number],
  bundleOffset: number,
): [number, number] {
  const endpoints = resolveBundledArcEndpoints(source, target, bundleOffset);
  return interpolatePosition(endpoints.source, endpoints.target, 0.975);
}

function createBundledArcMeta(bundleCount = ARC_BUNDLE_COUNT): ArcBundleMeta[] {
  return getBundleOffsets(bundleCount).map((bundleOffset, bundleIndex) => ({
    bundleIndex,
    bundleCount,
    bundleOffset,
  }));
}

export async function buildTwoDArcData(
  data: FlowArcSource | null,
  threatData: ThreatMapResponse | null,
  activeThreatCountryCodes: readonly string[],
): Promise<BundledTwoDArcDatum[]> {
  if (!data) {
    return [];
  }

  const bundledMeta = createBundledArcMeta();

  const rows = await Promise.all(data.flows.map(async (flow) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    const target = await getCountryCentroid(flow.victimCountry);
    if (!source) {
      return null;
    }
    if (!target) {
      return null;
    }

    const sourcePosition: [number, number] = [source.lon, source.lat];
    const targetPosition: [number, number] = [target.lon, target.lat];
    const visualLevel = resolveThreatVisualLevel(
      threatData?.countries.find((country) => country.country === flow.victimCountry)?.eventLevel ?? 'low',
      flow.victimCountry,
      activeThreatCountryCodes,
    );

    return bundledMeta.map(({ bundleIndex, bundleCount, bundleOffset }) => {
      const bundledEndpoints = resolveBundledArcEndpoints(sourcePosition, targetPosition, bundleOffset);

      return {
        id: `${flow.attackerCountry}-${flow.victimCountry}-${bundleIndex}`,
        source: sourcePosition,
        target: targetPosition,
        arrowPosition: resolveBundleArrowPosition(sourcePosition, targetPosition, bundleOffset),
        label: `${flow.attackerCountry} → ${flow.victimCountry}`,
        count: flow.count,
        angle: getBearing(bundledEndpoints.source, bundledEndpoints.target),
        visualLevel,
        bundleIndex,
        bundleCount,
        bundleOffset,
      };
    });
  }));

  return rows.flatMap((row): BundledTwoDArcDatum[] => row ?? []);
}

export async function buildCanvasArcData(
  data: FlowArcSource | null,
  threatData: ThreatMapResponse | null,
  activeThreatCountryCodes: readonly string[],
): Promise<BundledCanvasArcDatum[]> {
  if (!data) {
    return [];
  }

  const bundledMeta = createBundledArcMeta();

  const rows = await Promise.all(data.flows.map(async (flow) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    const target = await getCountryCentroid(flow.victimCountry);
    if (!source) {
      return null;
    }
    if (!target) {
      return null;
    }

    const sourcePosition: [number, number] = [source.lon, source.lat];
    const targetPosition: [number, number] = [target.lon, target.lat];
    const visualLevel = resolveThreatVisualLevel(
      threatData?.countries.find((country) => country.country === flow.victimCountry)?.eventLevel ?? 'low',
      flow.victimCountry,
      activeThreatCountryCodes,
    );

    return bundledMeta.map(({ bundleIndex, bundleCount, bundleOffset }) => ({
      id: `${flow.attackerCountry}-${flow.victimCountry}-${bundleIndex}`,
      source: sourcePosition,
      target: targetPosition,
      count: flow.count,
      visualLevel,
      attackerCountry: flow.attackerCountry,
      victimCountry: flow.victimCountry,
      firstDate: flow.firstDate ?? null,
      lastDate: flow.lastDate ?? null,
      bundleIndex,
      bundleCount,
      bundleOffset,
    }));
  }));

  return rows.flatMap((row): BundledCanvasArcDatum[] => row ?? []);
}
