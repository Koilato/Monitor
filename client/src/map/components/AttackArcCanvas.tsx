import { useEffect, useRef, useState, type RefObject } from 'react';
import type maplibregl from 'maplibre-gl';
import { normalizeWorldPosition } from 'map/lib/world-overview';
import type { ThreatMapResponse } from '@shared/types';

import {
  buildCanvasArcData,
  type ArcBundleMeta,
  type BundledCanvasArcDatum,
  type FlowArcSource,
} from 'map/lib/arc-data';
import { resolveAttackArcFrameWindow } from 'map/lib/attack-arc-animation';
import {
  type ArcPath,
  resolveArcCurve,
  resolveArcPath,
  slicePathByT,
  type ArcPathPoint,
  type ResolvedArcCurve,
  type ScreenPoint,
} from 'map/lib/attack-arc-path';
import {
  createInitialFlowSchedule,
  type ScheduledFlowDatum,
} from 'map/lib/flow-playback';
import {
  getCountryRenderGeometry,
  type CountryRenderGeometry,
} from 'map/lib/country-geometry';
import {
  buildThreatColorExpression,
  buildThreatGlowColorExpression,
  buildThreatOutlineColorExpression,
} from 'map/layers/effects';
import {
  THREAT_FILL_LAYER_ID,
  THREAT_GLOW_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import { getThreatVisualToken, type ThreatVisualLevel } from 'map/layers/tokens';
import {
  deckColorToRgbaString,
  rgbaStringToDeckColor,
  scaleDeckColorAlpha,
} from 'shared/styles/color-utils';
import type { FlowPlaybackMode } from 'map/state/map-state';
import type {
  ArcLengthPreset,
  AttackArcStageSettings,
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
  bundleAlpha: number;
  widthBoost: number;
  lineStyle: string;
  ringStyle: string;
  dotStyle: string;
};

interface CachedAttackPath {
  revision: number;
  path: ArcPath;
  drawingPath: Path2D;
  targetRingCache: Map<string, CachedTargetRings>;
  start: ScreenPoint;
  end: ScreenPoint;
}

interface CachedTargetRings {
  rings: Path2D[];
  dot: Path2D;
}

interface CachedCountryPath {
  revision: number;
  path: Path2D;
}

interface ActiveCountryThreat {
  level: Exclude<ThreatVisualLevel, 'none'>;
  alpha: number;
}

interface HeldAttackRender {
  attack: CanvasAttackRuntime;
  cachedPath: CachedAttackPath;
}

const VISUAL_LEVEL_PRIORITY: Record<Exclude<ThreatVisualLevel, 'none'>, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const ARC_LENGTH_PRESETS: ArcLengthPreset[] = ['short', 'medium', 'long'];
const ATTACK_CANVAS_MAX_DPR = 1.5;
const PULSE_CANVAS_MAX_DPR = 1;

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

function hexToCanvasRgb(value: string): string {
  return `rgb(${hexToRgbString(value)})`;
}

function syncCanvasSize(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  maxDpr = Number.POSITIVE_INFINITY,
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, maxDpr));
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
  lineStyle: string,
) {
  if (points.length < 2) {
    return;
  }

  context.globalAlpha = clamp(alpha, 0, 1);
  context.setLineDash([]);
  context.lineDashOffset = 0;
  context.strokeStyle = lineStyle;
  context.lineWidth = lineWidth;
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

function drawArcPathByLength(
  context: CanvasRenderingContext2D,
  cachedPath: CachedAttackPath,
  startRatio: number,
  endRatio: number,
  alpha: number,
  lineWidth: number,
  lineStyle: string,
) {
  const path = cachedPath.path;
  const clampedStart = clamp(startRatio, 0, 1);
  const clampedEnd = clamp(endRatio, 0, 1);

  if (clampedEnd <= clampedStart || path.points.length < 2) {
    return;
  }

  const startLength = path.totalLength * clampedStart;
  const endLength = path.totalLength * clampedEnd;
  const visibleLength = endLength - startLength;
  if (visibleLength <= 0) {
    return;
  }

  context.globalAlpha = clamp(alpha, 0, 1);
  context.strokeStyle = lineStyle;
  context.lineWidth = lineWidth;

  if (clampedStart <= 0 && clampedEnd >= 1) {
    context.setLineDash([]);
    context.lineDashOffset = 0;
    context.stroke(cachedPath.drawingPath);
    return;
  }

  context.setLineDash([visibleLength, Math.max(path.totalLength - visibleLength, 1)]);
  context.lineDashOffset = -startLength;
  context.stroke(cachedPath.drawingPath);
}

function drawArc(
  context: CanvasRenderingContext2D,
  attack: CanvasAttackRuntime,
  cachedPath: CachedAttackPath,
  stageSettings: AttackArcStageSettings,
  startT: number,
  endT: number,
  alpha: number,
) {
  const resolvedAlpha = alpha * attack.bundleAlpha * stageSettings.lineAlpha;
  const resolvedLineWidth = attack.lineWidth + attack.widthBoost;

  if (attack.lengthBasedProgress) {
    drawArcPathByLength(
      context,
      cachedPath,
      startT,
      endT,
      resolvedAlpha,
      resolvedLineWidth,
      attack.lineStyle,
    );
    return;
  }

  drawArcPath(
    context,
    slicePathByT(cachedPath.path, startT, endT),
    resolvedAlpha,
    resolvedLineWidth,
    attack.lineStyle,
  );
}

function buildCanvasPath(curve: ResolvedArcCurve): Path2D {
  const drawingPath = new Path2D();

  drawingPath.moveTo(curve.start.x, curve.start.y);
  if (curve.curveType === 'cubic') {
    drawingPath.bezierCurveTo(
      curve.controlA.x,
      curve.controlA.y,
      curve.controlB.x,
      curve.controlB.y,
      curve.end.x,
      curve.end.y,
    );
  } else {
    drawingPath.quadraticCurveTo(
      curve.control.x,
      curve.control.y,
      curve.end.x,
      curve.end.y,
    );
  }

  return drawingPath;
}

function getCachedAttackPath(
  cache: Map<string, CachedAttackPath>,
  attack: CanvasAttackRuntime,
  map: maplibregl.Map,
  revision: number,
): CachedAttackPath {
  const cached = cache.get(attack.id);
  if (cached?.revision === revision) {
    return cached;
  }

  const sourcePoint = map.project(attack.source);
  const targetPoint = map.project(attack.target);
  const start = { x: sourcePoint.x, y: sourcePoint.y };
  const end = { x: targetPoint.x, y: targetPoint.y };
  const curve = resolveArcCurve(start, end, attack.bundleOffset, attack);
  const path = resolveArcPath(start, end, attack.bundleOffset, attack);
  const nextCachedPath = {
    revision,
    path,
    drawingPath: buildCanvasPath(curve),
    targetRingCache: new Map(),
    start,
    end,
  };
  cache.set(attack.id, nextCachedPath);
  return nextCachedPath;
}

function createActiveGroupsByLength(): Record<ArcLengthPreset, Set<string>> {
  return {
    short: new Set<string>(),
    medium: new Set<string>(),
    long: new Set<string>(),
  };
}

function resetActiveGroupsByLength(
  groups: Record<ArcLengthPreset, Set<string>>,
  attacks: CanvasAttackRuntime[],
) {
  for (const preset of ARC_LENGTH_PRESETS) {
    groups[preset].clear();
  }

  for (const attack of attacks) {
    groups[attack.lengthPreset].add(attack.groupKey);
  }
}

function drawTargetRings(
  context: CanvasRenderingContext2D,
  cachedPath: CachedAttackPath,
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
  const cacheKey = `${ringRadius}:${ringCount}:${ringSpacing}:${ringDotRadius}`;
  let cachedRings = cachedPath.targetRingCache.get(cacheKey);
  if (!cachedRings) {
    const spacing = resolveRingSpacing(ringRadius, ringCount, ringSpacing);
    const rings: Path2D[] = [];
    for (let index = 0; index < ringCount; index += 1) {
      const radius = Math.max(0, ringRadius - (index * spacing));
      if (radius <= 0) {
        continue;
      }

      const ring = new Path2D();
      ring.arc(cachedPath.end.x, cachedPath.end.y, radius, 0, Math.PI * 2);
      rings.push(ring);
    }

    const dot = new Path2D();
    dot.arc(cachedPath.end.x, cachedPath.end.y, ringDotRadius, 0, Math.PI * 2);
    cachedRings = { rings, dot };
    cachedPath.targetRingCache.set(cacheKey, cachedRings);
  }

  context.setLineDash([]);
  context.lineDashOffset = 0;
  context.strokeStyle = ringColor;
  context.lineWidth = ringLineWidth;
  for (let index = 0; index < cachedRings.rings.length; index += 1) {
    const nextRingAlpha = Math.max(0, ringAlpha * (1 - (index / Math.max(1, ringCount + 0.5))));
    context.globalAlpha = clamp(nextRingAlpha, 0, 1);
    context.stroke(cachedRings.rings[index]);
  }

  context.globalAlpha = clamp(dotAlpha, 0, 1);
  context.fillStyle = dotColor;
  context.fill(cachedRings.dot);
}

function drawHeldAttackLayer(
  context: CanvasRenderingContext2D,
  heldAttacks: HeldAttackRender[],
  width: number,
  height: number,
) {
  context.globalAlpha = 1;
  context.setLineDash([]);
  context.lineDashOffset = 0;
  context.clearRect(0, 0, width, height);

  if (heldAttacks.length === 0) {
    return;
  }

  const renderedRingGroups = new Set<string>();
  for (const { attack, cachedPath } of heldAttacks) {
    const stageSettings = attack.stages.stage2;
    drawArc(context, attack, cachedPath, stageSettings, 0, 1, 1);

    if (attack.dedupeTargetRings && renderedRingGroups.has(attack.groupKey)) {
      continue;
    }

    renderedRingGroups.add(attack.groupKey);
    drawTargetRings(
      context,
      cachedPath,
      stageSettings.ringAlpha,
      stageSettings.dotAlpha,
      attack.ringStyle,
      attack.dotStyle,
      stageSettings.ringRadius,
      stageSettings.ringCount,
      stageSettings.ringSpacing,
      stageSettings.ringLineWidth,
      stageSettings.ringDotRadius,
    );
  }

  context.globalAlpha = 1;
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
}

function resolveStageSettings(
  attack: CanvasAttackRuntime,
  phase: 'flight' | 'hold' | 'fade',
): AttackArcStageSettings {
  if (phase === 'flight') {
    return attack.stages.stage1;
  }

  if (phase === 'hold') {
    return attack.stages.stage2;
  }

  return attack.stages.stage3;
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

function buildCountryThreatSignature(countryThreats: Map<string, ActiveCountryThreat>): string {
  if (countryThreats.size === 0) {
    return '';
  }

  return [...countryThreats.entries()]
    .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode))
    .map(([countryCode, threat]) => `${countryCode}:${threat.level}:${threat.alpha}`)
    .join('|');
}

function buildHeldAttackSignature(heldAttacks: HeldAttackRender[]): string {
  if (heldAttacks.length === 0) {
    return '';
  }

  return heldAttacks
    .map(({ attack }) => `${attack.id}:${attack.startAt}`)
    .join('|');
}

function clearAnimatedThreatCountryState(map: maplibregl.Map) {
  if (map.getLayer(THREAT_FILL_LAYER_ID)) {
    map.setPaintProperty(THREAT_FILL_LAYER_ID, 'fill-color', 'rgba(0,0,0,0)');
  }
  if (map.getLayer(THREAT_OUTLINE_LAYER_ID)) {
    map.setPaintProperty(THREAT_OUTLINE_LAYER_ID, 'line-color', 'rgba(0,0,0,0)');
  }
  if (map.getLayer(THREAT_GLOW_LAYER_ID)) {
    map.setPaintProperty(THREAT_GLOW_LAYER_ID, 'line-color', 'rgba(0,0,0,0)');
  }
}

function collectArcCountryCodes(arcData: BundledCanvasArcDatum[]): string[] {
  return [...new Set(arcData.flatMap((attack) => [attack.attackerCountry, attack.victimCountry]))];
}

async function loadCountryGeometryCache(
  arcData: BundledCanvasArcDatum[],
  cache: Map<string, CountryRenderGeometry | null>,
) {
  const countryCodes = collectArcCountryCodes(arcData);
  await Promise.all(countryCodes.map(async (countryCode) => {
    if (cache.has(countryCode)) {
      return;
    }
    cache.set(countryCode, await getCountryRenderGeometry(countryCode));
  }));
}

function getCachedCountryPath(
  cache: Map<string, CachedCountryPath>,
  geometry: CountryRenderGeometry,
  map: maplibregl.Map,
  revision: number,
): Path2D {
  const cached = cache.get(geometry.code);
  if (cached?.revision === revision) {
    return cached.path;
  }

  const path = new Path2D();
  for (const polygon of geometry.polygons) {
    for (const ring of polygon) {
      const first = ring[0];
      if (!first) {
        continue;
      }

      const firstPoint = map.project(normalizeWorldPosition(first));
      path.moveTo(firstPoint.x, firstPoint.y);

      for (let index = 1; index < ring.length; index += 1) {
        const coordinate = ring[index];
        if (!coordinate) {
          continue;
        }
        const point = map.project(normalizeWorldPosition(coordinate));
        path.lineTo(point.x, point.y);
      }

      path.closePath();
    }
  }

  cache.set(geometry.code, {
    revision,
    path,
  });

  return path;
}

function getOverlayThreatStyle(threat: ActiveCountryThreat, debugSettings: MapDebugSettings) {
  const token = getThreatVisualToken(threat.level);
  return {
    fill: scaleRgbaAlpha(token.fill, threat.alpha * debugSettings.threatFillOpacity),
    stroke: scaleRgbaAlpha(token.stroke, threat.alpha * debugSettings.threatOutlineOpacity),
    glow: scaleRgbaAlpha(token.glow, threat.alpha * debugSettings.threatGlowOpacity),
  };
}

function drawThreatCountryOverlay(args: {
  context: CanvasRenderingContext2D;
  map: maplibregl.Map;
  countryThreats: Map<string, ActiveCountryThreat>;
  countryGeometryCache: Map<string, CountryRenderGeometry | null>;
  countryPathCache: Map<string, CachedCountryPath>;
  revision: number;
  debugSettings: MapDebugSettings;
  width: number;
  height: number;
}) {
  const {
    context,
    map,
    countryThreats,
    countryGeometryCache,
    countryPathCache,
    revision,
    debugSettings,
    width,
    height,
  } = args;

  context.clearRect(0, 0, width, height);
  if (countryThreats.size === 0) {
    return;
  }

  context.save();
  context.lineJoin = 'round';
  context.lineCap = 'round';

  for (const [countryCode, threat] of countryThreats) {
    const geometry = countryGeometryCache.get(countryCode);
    if (!geometry) {
      continue;
    }

    const path = getCachedCountryPath(countryPathCache, geometry, map, revision);
    const style = getOverlayThreatStyle(threat, debugSettings);

    if (debugSettings.threatGlowWidth > 0 && debugSettings.threatGlowOpacity > 0) {
      context.strokeStyle = style.glow;
      context.lineWidth = debugSettings.threatGlowWidth;
      context.stroke(path);
    }

    context.fillStyle = style.fill;
    context.fill(path, 'evenodd');

    if (debugSettings.threatOutlineVisible && debugSettings.threatOutlineWidth > 0) {
      context.strokeStyle = style.stroke;
      context.lineWidth = debugSettings.threatOutlineWidth;
      context.stroke(path);
    }
  }

  context.restore();
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
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
    const holdCanvas = holdCanvasRef.current;
    const pulseCanvas = pulseCanvasRef.current;
    const map = mapRef.current;

    if (!canvas || !mapReady || !map || !isEnabled || arcData.length === 0) {
      clearCanvas(canvas);
      clearCanvas(holdCanvas);
      clearCanvas(pulseCanvas);
      if (map) {
        restoreThreatCountryState(map, threatData, debugSettings);
      }
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const pulseContext = pulseCanvas?.getContext('2d') ?? null;
    const holdContext = holdCanvas?.getContext('2d') ?? null;
    const now = performance.now();
    const pending: CanvasAttackRuntime[] = (createInitialFlowSchedule(arcData, playbackMode, now) as BundledScheduledFlowDatum[]).map((datum) => ({
      ...datum,
      flightMs: datum.flightDuration + ((datum.bundleIndex % 2 === 0 ? -1 : 1) * 100),
      startAt: datum.startAt,
      groupKey: `${datum.flowKey}-${datum.startAt}`,
      bundleAlpha: Math.max(0, 1 - (datum.bundleIndex * datum.bundleAlphaStep)),
      widthBoost: Math.min(0.8, Math.max(0, datum.count - 1) * 0.08),
      lineStyle: hexToCanvasRgb(datum.visualStyle.lineColor),
      ringStyle: hexToCanvasRgb(datum.visualStyle.ringColor),
      dotStyle: hexToCanvasRgb(datum.visualStyle.dotColor),
    }));
    const activeAttacks: CanvasAttackRuntime[] = [];
    const activeGroupsByLength = createActiveGroupsByLength();
    const countryThreats = new Map<string, ActiveCountryThreat>();
    const heldAttacks: HeldAttackRender[] = [];
    const renderedRingGroups = new Set<string>();
    const pathCache = new Map<string, CachedAttackPath>();
    const countryPathCache = new Map<string, CachedCountryPath>();
    const countryGeometryCache = new Map<string, CountryRenderGeometry | null>();
    let frameId = 0;
    let pendingNeedsSort = false;
    let cameraRevision = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let lastPulseHadThreats = false;
    let lastPulseRevision = -1;
    let lastPulseSignature = '';
    let lastHoldRevision = -1;
    let lastHoldSignature = '';
    let cancelled = false;

    const bumpCameraRevision = () => {
      cameraRevision += 1;
      pathCache.clear();
      countryPathCache.clear();
    };

    const syncAllCanvasSizes = () => {
      if (cancelled) {
        return;
      }

      const { width, height } = syncCanvasSize(canvas, context, ATTACK_CANVAS_MAX_DPR);
      if (holdCanvas && holdContext) {
        syncCanvasSize(holdCanvas, holdContext, ATTACK_CANVAS_MAX_DPR);
      }
      if (pulseCanvas && pulseContext) {
        syncCanvasSize(pulseCanvas, pulseContext, PULSE_CANVAS_MAX_DPR);
      }

      if (width !== canvasWidth || height !== canvasHeight) {
        canvasWidth = width;
        canvasHeight = height;
        bumpCameraRevision();
      }
    };

    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (holdContext) {
      holdContext.lineCap = 'round';
      holdContext.lineJoin = 'round';
    }
    syncAllCanvasSizes();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(syncAllCanvasSizes)
      : null;
    resizeObserver?.observe(canvas);
    if (holdCanvas) {
      resizeObserver?.observe(holdCanvas);
    }
    if (pulseCanvas) {
      resizeObserver?.observe(pulseCanvas);
    }

    clearAnimatedThreatCountryState(map);
    void loadCountryGeometryCache(arcData, countryGeometryCache).then(() => {
      if (!cancelled) {
        bumpCameraRevision();
      }
    });
    map.on('move', bumpCameraRevision);
    map.on('resize', syncAllCanvasSizes);

    const render = (frameNow: number) => {
      if (cancelled || canvasRef.current !== canvas || mapRef.current !== map) {
        return;
      }

      if (canvasWidth <= 0 || canvasHeight <= 0) {
        syncAllCanvasSizes();
      }

      context.globalAlpha = 1;
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      resetActiveGroupsByLength(activeGroupsByLength, activeAttacks);
      while (true) {
        const nextIndex = pending.findIndex((attack) => (
          attack.startAt <= frameNow
          && (
            activeGroupsByLength[attack.lengthPreset].size < attack.maxConcurrentStarts
            || activeGroupsByLength[attack.lengthPreset].has(attack.groupKey)
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
        activeGroupsByLength[scheduledAttack.lengthPreset].add(scheduledAttack.groupKey);
      }

      countryThreats.clear();
      heldAttacks.length = 0;
      renderedRingGroups.clear();
      let nextActiveCount = 0;

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
        const stageSettings = resolveStageSettings(attack, frameWindow.phase);
        mergeActiveCountryThreat(countryThreats, attack, resolveCountryStageAlpha(frameWindow));
        const cachedPath = getCachedAttackPath(pathCache, attack, map, cameraRevision);

        if (frameWindow.phase === 'hold') {
          heldAttacks.push({ attack, cachedPath });
          activeAttacks[nextActiveCount] = attack;
          nextActiveCount += 1;
          continue;
        }

        drawArc(
          context,
          attack,
          cachedPath,
          stageSettings,
          frameWindow.startT,
          frameWindow.endT,
          frameWindow.alpha,
        );

        const shouldDrawRing = frameWindow.phase !== 'flight'
          && (!attack.dedupeTargetRings || !renderedRingGroups.has(attack.groupKey));
        if (shouldDrawRing) {
          renderedRingGroups.add(attack.groupKey);
          drawTargetRings(
            context,
            cachedPath,
            frameWindow.alpha * stageSettings.ringAlpha,
            frameWindow.alpha * stageSettings.dotAlpha,
            attack.ringStyle,
            attack.dotStyle,
            stageSettings.ringRadius,
            stageSettings.ringCount,
            stageSettings.ringSpacing,
            stageSettings.ringLineWidth,
            stageSettings.ringDotRadius,
          );
        }

        activeAttacks[nextActiveCount] = attack;
        nextActiveCount += 1;
      }

      activeAttacks.length = nextActiveCount;
      context.globalAlpha = 1;
      context.setLineDash([]);
      context.lineDashOffset = 0;

      const holdSignature = buildHeldAttackSignature(heldAttacks);
      if (
        holdContext
        && (
          holdSignature !== lastHoldSignature
          || lastHoldRevision !== cameraRevision
        )
      ) {
        drawHeldAttackLayer(holdContext, heldAttacks, canvasWidth, canvasHeight);
        lastHoldSignature = holdSignature;
        lastHoldRevision = cameraRevision;
      }

      const pulseSignature = buildCountryThreatSignature(countryThreats);
      const shouldDrawPulseOverlay = Boolean(pulseContext && pulseCanvas)
        && (
          pulseSignature !== lastPulseSignature
          || lastPulseRevision !== cameraRevision
          || (countryThreats.size === 0 && lastPulseHadThreats)
        );

      if (pulseContext && pulseCanvas && shouldDrawPulseOverlay) {
        drawThreatCountryOverlay({
          context: pulseContext,
          map,
          countryThreats,
          countryGeometryCache,
          countryPathCache,
          revision: cameraRevision,
          debugSettings,
          width: canvasWidth,
          height: canvasHeight,
        });
        lastPulseSignature = pulseSignature;
        lastPulseRevision = cameraRevision;
        lastPulseHadThreats = countryThreats.size > 0;
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
        frameId = window.requestAnimationFrame(render);
      } else {
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        if (holdContext) {
          holdContext.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        if (pulseContext) {
          pulseContext.clearRect(0, 0, canvasWidth, canvasHeight);
        }
      }
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      map.off('move', bumpCameraRevision);
      map.off('resize', syncAllCanvasSizes);
      clearCanvas(canvas);
      clearCanvas(holdCanvas);
      clearCanvas(pulseCanvas);
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

  return (
    <>
      <canvas ref={pulseCanvasRef} className="threat-pulse-canvas" aria-hidden="true" />
      <canvas ref={holdCanvasRef} className="attack-arc-hold-canvas" aria-hidden="true" />
      <canvas ref={canvasRef} className="attack-arc-canvas" aria-hidden="true" />
    </>
  );
}
