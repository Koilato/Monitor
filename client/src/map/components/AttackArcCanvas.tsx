import { useEffect, useRef, useState, type RefObject } from 'react';
import type maplibregl from 'maplibre-gl';
import type { ThreatMapResponse } from '@shared/types';

import {
  buildCanvasArcData,
  resolveArcStageSettings,
  type ArcBundleMeta,
  type BundledCanvasArcDatum,
  type FlowArcSource,
} from 'map/lib/arc-data';
import { resolveAttackArcFrameWindow } from 'map/lib/attack-arc-animation';
import {
  type ArcPath,
  resolveArcPath,
  slicePathByT,
  type ArcPathPoint,
  type ScreenPoint,
} from 'map/lib/attack-arc-path';
import {
  createInitialFlowSchedule,
  type ScheduledFlowDatum,
} from 'map/lib/flow-playback';
import {
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
  buildThreatPatternExpression,
} from 'map/layers/effects';
import {
  THREAT_FILL_LAYER_ID,
  THREAT_GLOW_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
  resolveThreatPatternImageId,
  THREAT_PATTERN_LAYER_ID,
} from 'map/layers/patterns';
import { getThreatVisualToken, type ThreatVisualLevel } from 'map/layers/tokens';
import {
  deckColorToRgbaString,
  rgbaStringToDeckColor,
  scaleDeckColorAlpha,
} from 'shared/styles/color-utils';
import type { FlowPlaybackMode } from 'map/state/map-state';
import type {
  AttackArcStagePreset,
  MapDebugSettings,
} from 'map/state/map-types';

interface AttackArcCanvasProps {
  mapRef: RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  isEnabled: boolean;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  playbackMode: FlowPlaybackMode;
  themeRevision: number;
  debugSettings: MapDebugSettings;
}

type BundledScheduledFlowDatum = ScheduledFlowDatum & ArcBundleMeta;

type CanvasAttackRuntime = BundledScheduledFlowDatum & {
  flightMs: number;
  groupKey: string;
};

interface CachedAttackPath {
  key: string;
  path: ArcPath;
  start: ScreenPoint;
  end: ScreenPoint;
}

interface ActiveCountryThreat {
  level: Exclude<ThreatVisualLevel, 'none'>;
  alpha: number;
}

const ATTACK_ARC_FRAME_INTERVAL_MS = 1000 / 20;
const COUNTRY_THREAT_UPDATE_INTERVAL_MS = 100;

const VISUAL_LEVEL_PRIORITY: Record<Exclude<ThreatVisualLevel, 'none'>, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToRgbString(value: string): string {
  const normalized = value.trim().replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if (![red, green, blue].every(Number.isFinite)) {
    return '255,255,255';
  }

  return `${red},${green},${blue}`;
}

function syncCanvasSize(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = window.devicePixelRatio || 1;
  const scaledWidth = Math.round(width * dpr);
  const scaledHeight = Math.round(height * dpr);

  if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  return { width, height };
}

function resolveRingSpacing(ringRadius: number, ringCount: number, ringSpacing: number): number {
  if (ringCount <= 1) {
    return ringRadius;
  }

  const maxVisibleSpacing = Math.max(1, ringRadius / ringCount);

  if (ringSpacing > 0) {
    return Math.min(ringSpacing, maxVisibleSpacing);
  }

  return Math.max(1, ringRadius / (ringCount + 1));
}

function drawArcPath(
  context: CanvasRenderingContext2D,
  points: ArcPathPoint[],
  alpha: number,
  lineWidth: number,
  lineColor: string,
) {
  if (points.length < 2) {
    return;
  }

  context.strokeStyle = `rgba(${hexToRgbString(lineColor)},${Math.max(0, Math.min(alpha, 1))})`;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();

  const origin = points[0];
  context.moveTo(origin.x, origin.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function findLengthIndex(lengths: number[], targetLength: number): number {
  let low = 0;
  let high = lengths.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((lengths[middle] ?? 0) < targetLength) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function interpolatePathPoint(left: ArcPathPoint, right: ArcPathPoint, ratio: number): ArcPathPoint {
  return {
    x: left.x + ((right.x - left.x) * ratio),
    y: left.y + ((right.y - left.y) * ratio),
    t: left.t + ((right.t - left.t) * ratio),
  };
}

function pointAtPathLength(path: ArcPath, targetLength: number): ArcPathPoint {
  const first = path.points[0] ?? { x: 0, y: 0, t: 0 };
  const last = path.points[path.points.length - 1] ?? first;

  if (targetLength <= 0 || path.totalLength <= 0) {
    return first;
  }

  if (targetLength >= path.totalLength) {
    return last;
  }

  const index = findLengthIndex(path.lengths, targetLength);
  if (index <= 0) {
    return first;
  }

  const previousLength = path.lengths[index - 1] ?? 0;
  const nextLength = path.lengths[index] ?? previousLength;
  const previousPoint = path.points[index - 1] ?? first;
  const nextPoint = path.points[index] ?? previousPoint;
  const segmentLength = nextLength - previousLength;
  const ratio = segmentLength <= 0 ? 0 : (targetLength - previousLength) / segmentLength;
  return interpolatePathPoint(previousPoint, nextPoint, ratio);
}

function drawArcPathByLength(
  context: CanvasRenderingContext2D,
  path: ArcPath,
  startRatio: number,
  endRatio: number,
  alpha: number,
  lineWidth: number,
  lineColor: string,
) {
  const clampedStart = clamp(startRatio, 0, 1);
  const clampedEnd = clamp(endRatio, 0, 1);

  if (clampedEnd <= clampedStart || path.points.length < 2) {
    return;
  }

  const startLength = path.totalLength * clampedStart;
  const endLength = path.totalLength * clampedEnd;
  const startPoint = pointAtPathLength(path, startLength);
  const endPoint = pointAtPathLength(path, endLength);

  context.strokeStyle = `rgba(${hexToRgbString(lineColor)},${Math.max(0, Math.min(alpha, 1))})`;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(startPoint.x, startPoint.y);

  for (let index = findLengthIndex(path.lengths, startLength); index < path.points.length; index += 1) {
    const length = path.lengths[index] ?? 0;
    const point = path.points[index];
    if (!point || length <= startLength) {
      continue;
    }
    if (length >= endLength) {
      break;
    }
    context.lineTo(point.x, point.y);
  }

  context.lineTo(endPoint.x, endPoint.y);
  context.stroke();
}

function drawArc(
  context: CanvasRenderingContext2D,
  attack: CanvasAttackRuntime,
  path: ArcPath,
  startT: number,
  endT: number,
  alpha: number,
  lineWidth: number,
  lineColor: string,
) {
  const widthBoost = Math.min(0.8, Math.max(0, attack.count - 1) * 0.08);
  const bundleAlpha = Math.max(0, 1 - (attack.bundleIndex * attack.bundleAlphaStep));
  const resolvedAlpha = alpha * bundleAlpha;
  const resolvedLineWidth = lineWidth + widthBoost;

  if (attack.lengthBasedProgress) {
    drawArcPathByLength(
      context,
      path,
      startT,
      endT,
      resolvedAlpha,
      resolvedLineWidth,
      lineColor,
    );
    return;
  }

  drawArcPath(
    context,
    slicePathByT(path, startT, endT),
    resolvedAlpha,
    resolvedLineWidth,
    lineColor,
  );
}

function createScreenPointKey(point: ScreenPoint): string {
  return `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`;
}

function createAttackPathCacheKey(attack: CanvasAttackRuntime, start: ScreenPoint, end: ScreenPoint): string {
  return [
    createScreenPointKey(start),
    createScreenPointKey(end),
    attack.bundleOffset,
    attack.curveType,
    attack.pathSamplingCount,
    attack.minArcHeightPx,
    attack.maxArcHeightPx,
    attack.arcHeightRatio,
    attack.controlInsetRatio,
    attack.curvatureRatio,
    attack.bundleSpreadRatio,
    attack.bundleMode,
    attack.bundleHeightStepPx,
  ].join('|');
}

function getCachedAttackPath(
  cache: Map<string, CachedAttackPath>,
  attack: CanvasAttackRuntime,
  map: maplibregl.Map,
): CachedAttackPath {
  const sourcePoint = map.project(attack.source);
  const targetPoint = map.project(attack.target);
  const start = { x: sourcePoint.x, y: sourcePoint.y };
  const end = { x: targetPoint.x, y: targetPoint.y };
  const key = createAttackPathCacheKey(attack, start, end);
  const cached = cache.get(attack.id);

  if (cached?.key === key) {
    return cached;
  }

  const nextCachedPath = {
    key,
    path: resolveArcPath(start, end, attack.bundleOffset, attack),
    start,
    end,
  };
  cache.set(attack.id, nextCachedPath);
  return nextCachedPath;
}

function getActiveGroupsByLength(attacks: CanvasAttackRuntime[]): Map<BundledCanvasArcDatum['lengthPreset'], Set<string>> {
  const groups = new Map<BundledCanvasArcDatum['lengthPreset'], Set<string>>();

  for (const attack of attacks) {
    const presetGroups = groups.get(attack.lengthPreset) ?? new Set<string>();
    presetGroups.add(attack.groupKey);
    groups.set(attack.lengthPreset, presetGroups);
  }

  return groups;
}

function drawTargetRings(
  context: CanvasRenderingContext2D,
  point: ScreenPoint,
  ringAlpha: number,
  dotAlpha: number,
  ringColor: string,
  dotColor: string,
  ringRadius: number,
  ringCount: number,
  ringSpacing: number,
  ringLineWidth: number,
  ringDotRadius: number,
) {
  const spacing = resolveRingSpacing(ringRadius, ringCount, ringSpacing);
  for (let index = 0; index < ringCount; index += 1) {
    const radius = Math.max(0, ringRadius - (index * spacing));
    if (radius <= 0) {
      continue;
    }

    const nextRingAlpha = Math.max(0, ringAlpha * (1 - (index / Math.max(1, ringCount + 0.5))));
    context.strokeStyle = `rgba(${hexToRgbString(ringColor)},${nextRingAlpha})`;
    context.lineWidth = ringLineWidth;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = `rgba(${hexToRgbString(dotColor)},${dotAlpha})`;
  context.beginPath();
  context.arc(point.x, point.y, ringDotRadius, 0, Math.PI * 2);
  context.fill();
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
}

function resolvePhaseStage(phase: 'flight' | 'hold' | 'fade'): AttackArcStagePreset {
  if (phase === 'flight') {
    return 'stage1';
  }

  if (phase === 'hold') {
    return 'stage2';
  }

  return 'stage3';
}

function buildActiveCountryExpression(
  countryThreats: Map<string, ActiveCountryThreat>,
  resolveValue: (threat: ActiveCountryThreat) => string,
  fallbackValue: string,
) {
  if (countryThreats.size === 0) {
    return fallbackValue;
  }

  const expression: unknown[] = [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
  ];
  const entries = [...countryThreats.entries()].sort(([left], [right]) => left.localeCompare(right));

  for (const [countryCode, threat] of entries) {
    expression.push(countryCode, resolveValue(threat));
  }

  expression.push(fallbackValue);
  return expression;
}

function quantizeAlpha(value: number): number {
  return Math.round(clamp(value, 0, 1) * 20) / 20;
}

function scaleRgbaAlpha(color: string, alpha: number): string {
  return deckColorToRgbaString(scaleDeckColorAlpha(rgbaStringToDeckColor(color), alpha));
}

function resolveCountryStageAlpha(frameWindow: ReturnType<typeof resolveAttackArcFrameWindow>): number {
  if (frameWindow.phase === 'flight') {
    return quantizeAlpha(frameWindow.endT);
  }

  if (frameWindow.phase === 'hold') {
    return 1;
  }

  return quantizeAlpha(frameWindow.alpha);
}

function mergeActiveCountryThreat(
  countryThreats: Map<string, ActiveCountryThreat>,
  attack: CanvasAttackRuntime,
  alpha: number,
) {
  if (attack.visualLevel === 'none' || alpha <= 0) {
    return;
  }

  for (const countryCode of [attack.attackerCountry, attack.victimCountry]) {
    const current = countryThreats.get(countryCode);
    const currentPriority = current ? VISUAL_LEVEL_PRIORITY[current.level] : 0;
    const nextPriority = VISUAL_LEVEL_PRIORITY[attack.visualLevel];

    if (!current || nextPriority > currentPriority || (nextPriority === currentPriority && alpha > current.alpha)) {
      countryThreats.set(countryCode, {
        level: attack.visualLevel,
        alpha,
      });
    }
  }
}

function serializeCountryThreats(countryThreats: Map<string, ActiveCountryThreat>): string {
  return [...countryThreats.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([countryCode, threat]) => `${countryCode}:${threat.level}:${threat.alpha.toFixed(2)}`)
    .join('|');
}

function applyDynamicThreatCountryState(
  map: maplibregl.Map,
  countryThreats: Map<string, ActiveCountryThreat>,
  _debugSettings: MapDebugSettings,
) {
  const fillExpression = buildActiveCountryExpression(
    countryThreats,
    (threat) => scaleRgbaAlpha(getThreatVisualToken(threat.level).fill, threat.alpha),
    'rgba(0,0,0,0)',
  );
  const outlineExpression = buildActiveCountryExpression(
    countryThreats,
    (threat) => scaleRgbaAlpha(getThreatVisualToken(threat.level).stroke, threat.alpha),
    'rgba(0,0,0,0)',
  );
  const glowExpression = buildActiveCountryExpression(
    countryThreats,
    (threat) => scaleRgbaAlpha(getThreatVisualToken(threat.level).glow, threat.alpha),
    'rgba(0,0,0,0)',
  );
  const patternExpression = buildActiveCountryExpression(
    countryThreats,
    (threat) => (threat.alpha >= 0.5
      ? resolveThreatPatternImageId(threat.level, true)
      : COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID),
    COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
  );

  if (map.getLayer(THREAT_FILL_LAYER_ID)) {
    map.setPaintProperty(THREAT_FILL_LAYER_ID, 'fill-color', fillExpression);
  }
  if (map.getLayer(THREAT_PATTERN_LAYER_ID)) {
    map.setPaintProperty(THREAT_PATTERN_LAYER_ID, 'fill-pattern', patternExpression);
  }
  if (map.getLayer(THREAT_OUTLINE_LAYER_ID)) {
    map.setPaintProperty(THREAT_OUTLINE_LAYER_ID, 'line-color', outlineExpression);
  }
  if (map.getLayer(THREAT_GLOW_LAYER_ID)) {
    map.setPaintProperty(THREAT_GLOW_LAYER_ID, 'line-color', glowExpression);
  }
}

function restoreThreatCountryState(
  map: maplibregl.Map,
  threatData: ThreatMapResponse | null,
  debugSettings: MapDebugSettings,
) {
  if (map.getLayer(THREAT_FILL_LAYER_ID)) {
    map.setPaintProperty(
      THREAT_FILL_LAYER_ID,
      'fill-color',
      buildThreatColorExpression(
        threatData,
        debugSettings.threatColorsEnabled,
        debugSettings.baseCountryFillColor,
      ),
    );
  }
  if (map.getLayer(THREAT_PATTERN_LAYER_ID)) {
    map.setPaintProperty(
      THREAT_PATTERN_LAYER_ID,
      'fill-pattern',
      buildThreatPatternExpression(
        threatData,
        debugSettings.threatColorsEnabled,
      ),
    );
  }
  if (map.getLayer(THREAT_OUTLINE_LAYER_ID)) {
    map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-color',
      buildThreatOutlineColorExpression(
        threatData,
        debugSettings.threatColorsEnabled,
        debugSettings.threatOutlineNeutralColor,
      ),
    );
  }
  if (map.getLayer(THREAT_GLOW_LAYER_ID)) {
    map.setPaintProperty(
      THREAT_GLOW_LAYER_ID,
      'line-color',
      buildThreatGlowColorExpression(
        threatData,
        debugSettings.threatColorsEnabled,
        debugSettings.threatGlowNeutralColor,
      ),
    );
  }
}

export function AttackArcCanvas({
  mapRef,
  mapReady,
  isEnabled,
  flowData,
  threatData,
  playbackMode,
  themeRevision,
  debugSettings,
}: AttackArcCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [arcData, setArcData] = useState<BundledCanvasArcDatum[]>([]);
  const attackArcSettings = debugSettings.attackArc;

  useEffect(() => {
    if (!isEnabled || !flowData) {
      setArcData([]);
      return;
    }

    let cancelled = false;

    async function loadArcData() {
      const nextData = await buildCanvasArcData(flowData, attackArcSettings);
      if (!cancelled) {
        setArcData(nextData);
      }
    }

    loadArcData().catch((error) => {
      console.error('Failed to build canvas attack arc data', error);
      if (!cancelled) {
        setArcData([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    attackArcSettings,
    flowData,
    isEnabled,
    themeRevision,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;

    if (!canvas || !mapReady || !map || !isEnabled || arcData.length === 0) {
      clearCanvas(canvas);
      if (map) {
        restoreThreatCountryState(map, threatData, debugSettings);
      }
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const now = performance.now();
    const pending: CanvasAttackRuntime[] = (createInitialFlowSchedule(arcData, playbackMode, now) as BundledScheduledFlowDatum[]).map((datum) => ({
      ...datum,
      flightMs: datum.flightDuration + ((datum.bundleIndex % 2 === 0 ? -1 : 1) * 100),
      startAt: datum.startAt,
      groupKey: `${datum.flowKey}-${datum.startAt}`,
    }));
    const activeAttacks: CanvasAttackRuntime[] = [];
    const pathCache = new Map<string, CachedAttackPath>();
    let frameId = 0;
    let timeoutId = 0;
    let lastAppliedCountrySignature = '';
    let lastCountryStateAppliedAt = 0;
    let pendingNeedsSort = false;

    const render = (frameNow: number) => {
      const activeCanvas = canvasRef.current;
      const activeMap = mapRef.current;

      if (!activeCanvas || !activeMap) {
        return;
      }

      const activeContext = activeCanvas.getContext('2d');
      if (!activeContext) {
        return;
      }

      const { width, height } = syncCanvasSize(activeCanvas, activeContext);
      activeContext.clearRect(0, 0, width, height);

      const activeGroupsByLength = getActiveGroupsByLength(activeAttacks);
      while (true) {
        const nextIndex = pending.findIndex((attack) => (
          attack.startAt <= frameNow
          && (
            (activeGroupsByLength.get(attack.lengthPreset)?.size ?? 0) < attack.maxConcurrentStarts
            || activeGroupsByLength.get(attack.lengthPreset)?.has(attack.groupKey)
          )
        ));
        if (nextIndex < 0) {
          break;
        }

        const [scheduledAttack] = pending.splice(nextIndex, 1);
        if (!scheduledAttack) {
          break;
        }

        activeAttacks.push({
          ...scheduledAttack,
          startAt: frameNow,
        });
        const presetGroups = activeGroupsByLength.get(scheduledAttack.lengthPreset) ?? new Set<string>();
        presetGroups.add(scheduledAttack.groupKey);
        activeGroupsByLength.set(scheduledAttack.lengthPreset, presetGroups);
      }

      const nextActiveAttacks: CanvasAttackRuntime[] = [];
      const nextCountryThreats = new Map<string, ActiveCountryThreat>();
      const renderedRingGroups = new Set<string>();

      for (let index = 0; index < activeAttacks.length; index += 1) {
        const attack = activeAttacks[index];
        if (!attack) {
          continue;
        }

        const elapsed = frameNow - attack.startAt;
        const total = attack.flightMs + attack.holdDuration + attack.fadeoutDuration;
        if (elapsed > total) {
          pending.push({
            ...attack,
            startAt: frameNow + attack.replayDelayMs,
          });
          pendingNeedsSort = true;
          continue;
        }

        const frameWindow = resolveAttackArcFrameWindow(
          elapsed,
          attack.flightMs,
          attack.holdDuration,
          attack.fadeoutDuration,
        );
        const stageSettings = resolveArcStageSettings(
          attack,
          resolvePhaseStage(frameWindow.phase),
          attack.visualStyle,
        );
        mergeActiveCountryThreat(nextCountryThreats, attack, resolveCountryStageAlpha(frameWindow));
        const cachedPath = getCachedAttackPath(pathCache, attack, activeMap);

        activeContext.save();
        drawArc(
          activeContext,
          attack,
          cachedPath.path,
          frameWindow.startT,
          frameWindow.endT,
          frameWindow.alpha * stageSettings.lineAlpha,
          stageSettings.lineWidth,
          stageSettings.lineColor,
        );
        activeContext.restore();

        const shouldDrawRing = frameWindow.phase !== 'flight'
          && (!attack.dedupeTargetRings || !renderedRingGroups.has(attack.groupKey));
        if (shouldDrawRing) {
          renderedRingGroups.add(attack.groupKey);
          drawTargetRings(
            activeContext,
            cachedPath.end,
            frameWindow.alpha * stageSettings.ringAlpha,
            frameWindow.alpha * stageSettings.dotAlpha,
            stageSettings.ringColor,
            stageSettings.dotColor,
            stageSettings.ringRadius,
            stageSettings.ringCount,
            stageSettings.ringSpacing,
            stageSettings.ringLineWidth,
            stageSettings.ringDotRadius,
          );
        }

        nextActiveAttacks.push(attack);
      }

      activeAttacks.length = 0;
      activeAttacks.push(...nextActiveAttacks);

      const nextCountrySignature = serializeCountryThreats(nextCountryThreats);
      if (
        nextCountrySignature !== lastAppliedCountrySignature
        && frameNow - lastCountryStateAppliedAt >= COUNTRY_THREAT_UPDATE_INTERVAL_MS
      ) {
        applyDynamicThreatCountryState(activeMap, nextCountryThreats, debugSettings);
        lastAppliedCountrySignature = nextCountrySignature;
        lastCountryStateAppliedAt = frameNow;
      }

      if (pendingNeedsSort) {
        pending.sort((left, right) => {
          if (left.startAt !== right.startAt) {
            return left.startAt - right.startAt;
          }
          return left.sourceIndex - right.sourceIndex;
        });
        pendingNeedsSort = false;
      }

      if (activeAttacks.length > 0 || pending.length > 0) {
        timeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(render);
        }, ATTACK_ARC_FRAME_INTERVAL_MS);
      } else {
        activeContext.clearRect(0, 0, width, height);
      }
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      clearCanvas(canvas);
      restoreThreatCountryState(map, threatData, debugSettings);
    };
  }, [
    arcData,
    debugSettings,
    isEnabled,
    mapReady,
    mapRef,
    playbackMode,
    threatData,
    themeRevision,
  ]);

  return <canvas ref={canvasRef} className="attack-arc-canvas" aria-hidden="true" />;
}
