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
import {
  resolveAttackArcFrameWindow,
} from 'map/lib/attack-arc-animation';
import {
  createInitialFlowSchedule,
  type ScheduledFlowDatum,
} from 'map/lib/flow-playback';
import { type ThreatVisualLevel } from 'map/layers/tokens';
import { normalizeCssColor } from 'shared/styles/color-utils';
import type { FlowPlaybackMode } from 'map/state/map-state';
import type {
  AttackArcStagePreset,
  AttackArcStageSettings,
  MapDebugSettings,
} from 'map/state/map-types';

interface AttackArcCanvasProps {
  mapRef: RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  isEnabled: boolean;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  activeThreatCountryCodes: string[];
  playbackMode: FlowPlaybackMode;
  themeRevision: number;
  debugSettings: MapDebugSettings;
}

interface ScreenPoint {
  x: number;
  y: number;
}

type BundledScheduledFlowDatum = ScheduledFlowDatum & ArcBundleMeta;

type CanvasAttackRuntime = BundledScheduledFlowDatum & {
  colorRgb: string;
  flightMs: number;
  groupKey: string;
};

const ARC_COLOR_BY_LEVEL: Record<'low' | 'medium' | 'high', string> = {
  low: '245,166,35',
  medium: '255,95,60',
  high: '235,40,45',
};

function getActiveArcColor(): string {
  if (typeof document === 'undefined') {
    return '220,120,255';
  }

  const cssValue = window.getComputedStyle(document.documentElement).getPropertyValue('--threat-active').trim();
  const normalized = normalizeCssColor(cssValue || 'rgba(220, 120, 255, 0.98)');
  const rgbMatch = normalized.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);

  if (!rgbMatch) {
    return '220,120,255';
  }

  return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
}

function resolveCanvasArcColor(visualLevel: ThreatVisualLevel): string {
  if (visualLevel === 'active') {
    return getActiveArcColor();
  }

  if (visualLevel === 'critical') {
    return ARC_COLOR_BY_LEVEL.high;
  }

  if (visualLevel === 'medium' || visualLevel === 'high' || visualLevel === 'low') {
    return ARC_COLOR_BY_LEVEL[visualLevel];
  }

  return ARC_COLOR_BY_LEVEL.low;
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

  if (ringSpacing > 0) {
    return ringSpacing;
  }

  return Math.max(1, ringRadius / (ringCount + 1));
}

function bezierPoint(t: number, start: ScreenPoint, control: ScreenPoint, end: ScreenPoint): ScreenPoint {
  const k = 1 - t;
  return {
    x: (k * k * start.x) + (2 * k * t * control.x) + (t * t * end.x),
    y: (k * k * start.y) + (2 * k * t * control.y) + (t * t * end.y),
  };
}

function resolveControlPoint(
  start: ScreenPoint,
  end: ScreenPoint,
  bundleOffset: number,
  curvatureRatio: number,
): ScreenPoint {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;

  let normalX = -dy / length;
  let normalY = dx / length;
  if (normalY > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  const liftBase = length * curvatureRatio;
  const lift = liftBase + (bundleOffset * liftBase * 0.3);

  return {
    x: midX + (normalX * lift),
    y: midY + (normalY * lift),
  };
}

function drawArc(
  context: CanvasRenderingContext2D,
  attack: CanvasAttackRuntime,
  startT: number,
  endT: number,
  alpha: number,
  start: ScreenPoint,
  end: ScreenPoint,
  lineWidth: number,
  segmentCount: number,
  curvatureRatio: number,
) {
  const control = resolveControlPoint(start, end, attack.bundleOffset, curvatureRatio);
  const widthBoost = Math.min(0.8, Math.max(0, attack.count - 1) * 0.08);
  const clampedStartT = Math.min(Math.max(startT, 0), 1);
  const clampedEndT = Math.min(Math.max(endT, 0), 1);
  const windowLength = Math.max(0, clampedEndT - clampedStartT);
  if (windowLength <= 0) {
    return;
  }

  context.strokeStyle = `rgba(${attack.colorRgb},${Math.max(0, Math.min(alpha, 1))})`;
  context.lineWidth = lineWidth + widthBoost;
  context.lineCap = 'round';
  context.beginPath();

  const origin = bezierPoint(clampedStartT, start, control, end);
  context.moveTo(origin.x, origin.y);

  const steps = Math.max(2, Math.ceil(segmentCount * windowLength));
  for (let index = 1; index <= steps; index += 1) {
    const t = clampedStartT + (windowLength * (index / steps));
    const point = bezierPoint(t, start, control, end);
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function drawTargetRings(
  context: CanvasRenderingContext2D,
  point: ScreenPoint,
  alpha: number,
  ringColorRgb: string,
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

    const ringAlpha = Math.max(0, alpha * (1 - (index / Math.max(1, ringCount + 0.5))));
    context.strokeStyle = `rgba(${ringColorRgb},${ringAlpha})`;
    context.lineWidth = ringLineWidth;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = `rgba(${ringColorRgb},${alpha})`;
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

function countActiveGroupsByLength(
  attacks: CanvasAttackRuntime[],
  lengthPreset: BundledCanvasArcDatum['lengthPreset'],
): number {
  return new Set(
    attacks
      .filter((attack) => attack.lengthPreset === lengthPreset)
      .map((attack) => attack.groupKey),
  ).size;
}

export function AttackArcCanvas({
  mapRef,
  mapReady,
  isEnabled,
  flowData,
  threatData,
  activeThreatCountryCodes,
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
      const nextData = await buildCanvasArcData(flowData, threatData, activeThreatCountryCodes, attackArcSettings);
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
    activeThreatCountryCodes,
    attackArcSettings,
    flowData,
    isEnabled,
    threatData,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;

    if (!canvas || !mapReady || !map || !isEnabled || arcData.length === 0) {
      clearCanvas(canvas);
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const now = performance.now();
    const pending: CanvasAttackRuntime[] = (createInitialFlowSchedule(arcData, playbackMode, now) as BundledScheduledFlowDatum[]).map((datum) => ({
      ...datum,
      colorRgb: resolveCanvasArcColor(datum.visualLevel),
      flightMs: datum.flightDuration + ((datum.bundleIndex % 2 === 0 ? -1 : 1) * 100),
      startAt: datum.startAt,
      groupKey: `${datum.flowKey}-${datum.startAt}`,
    }));
    const activeAttacks: CanvasAttackRuntime[] = [];
    let frameId = 0;

    const render = (now: number) => {
      if (!canvasRef.current || !mapRef.current) {
        return;
      }

      const activeContext = canvasRef.current.getContext('2d');
      if (!activeContext) {
        return;
      }

      const { width, height } = syncCanvasSize(canvasRef.current, activeContext);
      activeContext.clearRect(0, 0, width, height);

      while (true) {
        const nextIndex = pending.findIndex((attack) => (
          attack.startAt <= now
          && countActiveGroupsByLength(activeAttacks, attack.lengthPreset) < attack.maxConcurrentStarts
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
          startAt: now,
        });
      }

      const nextActiveAttacks: CanvasAttackRuntime[] = [];

      for (let index = 0; index < activeAttacks.length; index += 1) {
        const attack = activeAttacks[index];
        if (!attack) {
          continue;
        }

        const elapsed = now - attack.startAt;

        const total = attack.flightMs + attack.holdDuration + attack.fadeoutDuration;
        if (elapsed > total) {
          pending.push({
            ...attack,
            startAt: now + attack.replayDelayMs,
          });
          continue;
        }

        const frameWindow = resolveAttackArcFrameWindow(
          elapsed,
          attack.flightMs,
          attack.holdDuration,
          attack.fadeoutDuration,
        );
        const stageSettings: AttackArcStageSettings = resolveArcStageSettings(
          attack,
          resolvePhaseStage(frameWindow.phase),
        );
        const sourcePoint = mapRef.current.project(attack.source);
        const targetPoint = mapRef.current.project(attack.target);
        const start = { x: sourcePoint.x, y: sourcePoint.y };
        const end = { x: targetPoint.x, y: targetPoint.y };

        activeContext.save();
        drawArc(
          activeContext,
          attack,
          frameWindow.startT,
          frameWindow.endT,
          frameWindow.alpha,
          start,
          end,
          stageSettings.lineWidth,
          stageSettings.segmentCount,
          stageSettings.curvatureRatio,
        );
        activeContext.restore();

        if (frameWindow.phase !== 'flight') {
          drawTargetRings(
            activeContext,
            end,
            frameWindow.alpha,
            attack.colorRgb,
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
      pending.sort((left, right) => {
        if (left.startAt !== right.startAt) {
          return left.startAt - right.startAt;
        }
        return left.sourceIndex - right.sourceIndex;
      });

      if (activeAttacks.length > 0 || pending.length > 0) {
        frameId = window.requestAnimationFrame(render);
      } else {
        activeContext.clearRect(0, 0, width, height);
      }
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      clearCanvas(canvas);
    };
  }, [
    arcData,
    isEnabled,
    mapReady,
    mapRef,
    playbackMode,
    themeRevision,
  ]);

  return <canvas ref={canvasRef} className="attack-arc-canvas" aria-hidden="true" />;
}
