import type {
  AttackArcBundleMode,
  AttackArcCurveType,
} from 'map/state/map-types';

export interface ArcPathPoint {
  x: number;
  y: number;
  t: number;
}

export interface ArcPath {
  points: ArcPathPoint[];
  lengths: number[];
  totalLength: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ArcPathSettings {
  curveType: AttackArcCurveType;
  pathSamplingCount: number;
  minArcHeightPx: number;
  maxArcHeightPx: number;
  arcHeightRatio: number;
  controlInsetRatio: number;
  curvatureRatio: number;
  bundleSpreadRatio: number;
  bundleMode: AttackArcBundleMode;
  bundleHeightStepPx: number;
}

export function quadraticBezierPoint(
  t: number,
  start: ScreenPoint,
  control: ScreenPoint,
  end: ScreenPoint,
): ArcPathPoint {
  const k = 1 - t;
  return {
    x: (k * k * start.x) + (2 * k * t * control.x) + (t * t * end.x),
    y: (k * k * start.y) + (2 * k * t * control.y) + (t * t * end.y),
    t,
  };
}

export function cubicBezierPoint(
  t: number,
  start: ScreenPoint,
  controlA: ScreenPoint,
  controlB: ScreenPoint,
  end: ScreenPoint,
): ArcPathPoint {
  const k = 1 - t;
  return {
    x: (k * k * k * start.x)
      + (3 * k * k * t * controlA.x)
      + (3 * k * t * t * controlB.x)
      + (t * t * t * end.x),
    y: (k * k * k * start.y)
      + (3 * k * k * t * controlA.y)
      + (3 * k * t * t * controlB.y)
      + (t * t * t * end.y),
    t,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildPath(points: ArcPathPoint[]): ArcPath {
  const lengths: number[] = [];
  let totalLength = 0;

  for (let index = 0; index < points.length; index += 1) {
    if (index === 0) {
      lengths.push(0);
      continue;
    }

    const previous = points[index - 1];
    const point = points[index];
    if (!previous || !point) {
      lengths.push(totalLength);
      continue;
    }

    totalLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    lengths.push(totalLength);
  }

  return {
    points,
    lengths,
    totalLength,
  };
}

export function sampleQuadraticPath(
  start: ScreenPoint,
  control: ScreenPoint,
  end: ScreenPoint,
  sampleCount: number,
): ArcPath {
  const steps = Math.max(2, Math.round(sampleCount));
  return buildPath(Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    return quadraticBezierPoint(t, start, control, end);
  }));
}

export function sampleCubicPath(
  start: ScreenPoint,
  controlA: ScreenPoint,
  controlB: ScreenPoint,
  end: ScreenPoint,
  sampleCount: number,
): ArcPath {
  const steps = Math.max(2, Math.round(sampleCount));
  return buildPath(Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    return cubicBezierPoint(t, start, controlA, controlB, end);
  }));
}

function resolveNormal(start: ScreenPoint, end: ScreenPoint): ScreenPoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  let normalX = -dy / length;
  let normalY = dx / length;

  if (normalY > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  return { x: normalX, y: normalY };
}

function resolveArcHeight(
  distance: number,
  bundleOffset: number,
  settings: ArcPathSettings,
): number {
  const minHeight = Math.max(0, settings.minArcHeightPx);
  const maxHeight = Math.max(minHeight, settings.maxArcHeightPx);
  const ratioHeight = distance * Math.max(0, settings.arcHeightRatio || settings.curvatureRatio);
  const baseHeight = clamp(ratioHeight, minHeight, maxHeight);

  if (settings.bundleMode === 'pulse-same-path') {
    return baseHeight + (bundleOffset * settings.bundleHeightStepPx);
  }

  return baseHeight + (bundleOffset * baseHeight * 0.3);
}

export function resolveArcPath(
  start: ScreenPoint,
  end: ScreenPoint,
  bundleOffset: number,
  settings: ArcPathSettings,
): ArcPath {
  const baseDx = end.x - start.x;
  const baseDy = end.y - start.y;
  const baseDistance = Math.hypot(baseDx, baseDy) || 1;
  const normal = resolveNormal(start, end);
  const spread = settings.bundleMode === 'split-path'
    ? Math.max(0, baseDistance * settings.bundleSpreadRatio * bundleOffset)
    : 0;
  const resolvedStart = {
    x: start.x + (normal.x * spread),
    y: start.y + (normal.y * spread),
  };
  const resolvedEnd = {
    x: end.x + (normal.x * spread),
    y: end.y + (normal.y * spread),
  };
  const dx = resolvedEnd.x - resolvedStart.x;
  const dy = resolvedEnd.y - resolvedStart.y;
  const distance = Math.hypot(dx, dy) || 1;
  const height = resolveArcHeight(distance, bundleOffset, settings);
  const mid = {
    x: (resolvedStart.x + resolvedEnd.x) / 2,
    y: (resolvedStart.y + resolvedEnd.y) / 2,
  };
  const apex = {
    x: mid.x + (normal.x * height),
    y: mid.y + (normal.y * height),
  };

  if (settings.curveType === 'cubic') {
    const inset = clamp(settings.controlInsetRatio, 0.05, 0.95);
    const controlA = {
      x: resolvedStart.x + (dx * inset) + (normal.x * height),
      y: resolvedStart.y + (dy * inset) + (normal.y * height),
    };
    const controlB = {
      x: resolvedEnd.x - (dx * inset) + (normal.x * height),
      y: resolvedEnd.y - (dy * inset) + (normal.y * height),
    };
    return sampleCubicPath(resolvedStart, controlA, controlB, resolvedEnd, settings.pathSamplingCount);
  }

  return sampleQuadraticPath(resolvedStart, apex, resolvedEnd, settings.pathSamplingCount);
}

function interpolatePathPoint(left: ArcPathPoint, right: ArcPathPoint, ratio: number): ArcPathPoint {
  return {
    x: left.x + ((right.x - left.x) * ratio),
    y: left.y + ((right.y - left.y) * ratio),
    t: left.t + ((right.t - left.t) * ratio),
  };
}

function pointAtLength(path: ArcPath, targetLength: number): ArcPathPoint {
  const first = path.points[0] ?? { x: 0, y: 0, t: 0 };
  const last = path.points[path.points.length - 1] ?? first;

  if (targetLength <= 0 || path.totalLength <= 0) {
    return first;
  }

  if (targetLength >= path.totalLength) {
    return last;
  }

  const index = path.lengths.findIndex((length) => length >= targetLength);
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

export function slicePathByLength(path: ArcPath, startRatio: number, endRatio: number): ArcPathPoint[] {
  const clampedStart = clamp(startRatio, 0, 1);
  const clampedEnd = clamp(endRatio, 0, 1);
  if (clampedEnd <= clampedStart || path.points.length === 0) {
    return [];
  }

  const startLength = path.totalLength * clampedStart;
  const endLength = path.totalLength * clampedEnd;
  const sliced: ArcPathPoint[] = [pointAtLength(path, startLength)];

  for (let index = 0; index < path.points.length; index += 1) {
    const length = path.lengths[index] ?? 0;
    const point = path.points[index];
    if (!point || length <= startLength || length >= endLength) {
      continue;
    }
    sliced.push(point);
  }

  sliced.push(pointAtLength(path, endLength));
  return sliced;
}

export function slicePathByT(path: ArcPath, startT: number, endT: number): ArcPathPoint[] {
  const clampedStart = clamp(startT, 0, 1);
  const clampedEnd = clamp(endT, 0, 1);
  if (clampedEnd <= clampedStart || path.points.length === 0) {
    return [];
  }

  const first = path.points[0] ?? { x: 0, y: 0, t: 0 };
  const pointAtT = (targetT: number): ArcPathPoint => {
    if (targetT <= 0) {
      return first;
    }

    const last = path.points[path.points.length - 1] ?? first;
    if (targetT >= 1) {
      return last;
    }

    const index = path.points.findIndex((point) => point.t >= targetT);
    if (index <= 0) {
      return first;
    }

    const previous = path.points[index - 1] ?? first;
    const next = path.points[index] ?? previous;
    const delta = next.t - previous.t;
    const ratio = delta <= 0 ? 0 : (targetT - previous.t) / delta;
    return interpolatePathPoint(previous, next, ratio);
  };

  const sliced: ArcPathPoint[] = [pointAtT(clampedStart)];
  path.points.forEach((point) => {
    if (point.t > clampedStart && point.t < clampedEnd) {
      sliced.push(point);
    }
  });
  sliced.push(pointAtT(clampedEnd));
  return sliced;
}
