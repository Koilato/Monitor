import { useEffect, useRef, useState, type RefObject } from 'react';
import type maplibregl from 'maplibre-gl';
import type { ThreatMapResponse } from '@shared/types';

import {
  buildCanvasArcData,
  type ArcBundleMeta,
  type BundledCanvasArcDatum,
  type FlowArcSource,
} from 'map/lib/arc-data';
import {
  createInitialFlowSchedule,
  FLOW_REPLAY_DELAY_MS,
  type ScheduledFlowDatum,
  MAX_CONCURRENT_FLOW_STARTS,
} from 'map/lib/flow-playback';
import { type ThreatVisualLevel } from 'map/layers/tokens';
import { normalizeCssColor } from 'shared/styles/color-utils';
import type { FlowPlaybackMode } from 'map/state/map-state';

interface AttackArcCanvasProps {
  mapRef: RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  viewMode: '2d' | '3d';
  isEnabled: boolean;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  activeThreatCountryCodes: string[];
  playbackMode: FlowPlaybackMode;
  themeRevision: number;
}

interface ScreenPoint {
  x: number;
  y: number;
}

type BundledScheduledFlowDatum = ScheduledFlowDatum & ArcBundleMeta;

type CanvasAttackRuntime = BundledScheduledFlowDatum & {
  colorRgb: string;
  flight: number;
};

const FLIGHT_DURATION = 1300;
const HOLD_DURATION = 2000;
const FADEOUT_DURATION = 700;
const LIFT_RATIO = 0.16;
const LINE_WIDTH = 1.8;
const SEGMENTS = 100;
const BUNDLE_INTERVAL = 220;
const RING_OUTER = { r: 15, lw: 2.5 };
const RING_MIDDLE = { r: 10, lw: 2.0 };
const CENTER_DOT = { r: 6, color: '245,197,66' };

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

function bezierPoint(t: number, start: ScreenPoint, control: ScreenPoint, end: ScreenPoint): ScreenPoint {
  const k = 1 - t;
  return {
    x: (k * k * start.x) + (2 * k * t * control.x) + (t * t * end.x),
    y: (k * k * start.y) + (2 * k * t * control.y) + (t * t * end.y),
  };
}

function resolveControlPoint(start: ScreenPoint, end: ScreenPoint, bundleOffset: number): ScreenPoint {
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

  const liftBase = length * LIFT_RATIO;
  const lift = liftBase + (bundleOffset * liftBase * 0.3);

  return {
    x: midX + (normalX * lift),
    y: midY + (normalY * lift),
  };
}

function drawArc(
  context: CanvasRenderingContext2D,
  attack: CanvasAttackRuntime,
  progress: number,
  start: ScreenPoint,
  end: ScreenPoint,
) {
  const control = resolveControlPoint(start, end, attack.bundleOffset);
  const widthBoost = Math.min(0.8, Math.max(0, attack.count - 1) * 0.08);

  context.strokeStyle = `rgba(${attack.colorRgb},1)`;
  context.lineWidth = LINE_WIDTH + widthBoost;
  context.lineCap = 'round';
  context.beginPath();

  const origin = bezierPoint(0, start, control, end);
  context.moveTo(origin.x, origin.y);

  const steps = Math.max(2, Math.ceil(SEGMENTS * progress));
  for (let index = 1; index <= steps; index += 1) {
    const t = progress * (index / steps);
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
) {
  context.strokeStyle = `rgba(${ringColorRgb},${alpha})`;
  context.lineWidth = RING_OUTER.lw;
  context.beginPath();
  context.arc(point.x, point.y, RING_OUTER.r, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = `rgba(${ringColorRgb},${alpha})`;
  context.lineWidth = RING_MIDDLE.lw;
  context.beginPath();
  context.arc(point.x, point.y, RING_MIDDLE.r, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = `rgba(${CENTER_DOT.color},${alpha})`;
  context.beginPath();
  context.arc(point.x, point.y, CENTER_DOT.r, 0, Math.PI * 2);
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

export function AttackArcCanvas({
  mapRef,
  mapReady,
  viewMode,
  isEnabled,
  flowData,
  threatData,
  activeThreatCountryCodes,
  playbackMode,
  themeRevision,
}: AttackArcCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [arcData, setArcData] = useState<BundledCanvasArcDatum[]>([]);

  useEffect(() => {
    if (!isEnabled || viewMode !== '2d' || !flowData) {
      setArcData([]);
      return;
    }

    let cancelled = false;

    async function loadArcData() {
      const nextData = await buildCanvasArcData(flowData, threatData, activeThreatCountryCodes);
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
  }, [activeThreatCountryCodes, flowData, isEnabled, threatData, viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;

    if (!canvas || !mapReady || !map || viewMode !== '2d' || !isEnabled || arcData.length === 0) {
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
      flight: FLIGHT_DURATION + ((datum.bundleIndex % 2 === 0 ? -1 : 1) * 100),
      startAt: datum.startAt + (datum.bundleIndex * BUNDLE_INTERVAL),
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

      while (activeAttacks.length < MAX_CONCURRENT_FLOW_STARTS) {
        const nextIndex = pending.findIndex((attack) => attack.startAt <= now);
        if (nextIndex < 0) {
          break;
        }

        const [nextAttack] = pending.splice(nextIndex, 1);
        if (!nextAttack) {
          break;
        }

        activeAttacks.push({
          ...nextAttack,
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

        const total = attack.flight + HOLD_DURATION + FADEOUT_DURATION;
        if (elapsed > total) {
          pending.push({
            ...attack,
            startAt: now + FLOW_REPLAY_DELAY_MS,
          });
          continue;
        }

        const sourcePoint = mapRef.current.project(attack.source);
        const targetPoint = mapRef.current.project(attack.target);
        const start = { x: sourcePoint.x, y: sourcePoint.y };
        const end = { x: targetPoint.x, y: targetPoint.y };

        let progress = 1;
        let groupAlpha = 1;
        let phase: 'flight' | 'hold' | 'fade' = 'hold';

        if (elapsed < attack.flight) {
          phase = 'flight';
          progress = elapsed / attack.flight;
        } else if (elapsed < attack.flight + HOLD_DURATION) {
          phase = 'hold';
        } else {
          phase = 'fade';
          groupAlpha = 1 - ((elapsed - attack.flight - HOLD_DURATION) / FADEOUT_DURATION);
        }

        activeContext.save();
        activeContext.globalAlpha = groupAlpha;
        drawArc(activeContext, attack, progress, start, end);
        activeContext.restore();

        if (phase !== 'flight') {
          const ringElapsed = elapsed - attack.flight;
          const ringAlpha = Math.max(0, 1 - (ringElapsed / HOLD_DURATION));
          const finalRingAlpha = (phase === 'fade' ? groupAlpha : 1) * ringAlpha;
          drawTargetRings(activeContext, end, finalRingAlpha, attack.colorRgb);
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
  }, [arcData, isEnabled, mapReady, mapRef, playbackMode, themeRevision, viewMode]);

  return <canvas ref={canvasRef} className="attack-arc-canvas" aria-hidden="true" />;
}
