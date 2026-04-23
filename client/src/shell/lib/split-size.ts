export interface DraggedSplitSizeParams {
  startSize: number;
  delta: number;
  minSize: number;
  maxSize: number;
  anchor?: 'start' | 'end';
}

export function clampSize(value: number, minSize: number, maxSize: number): number {
  return Math.min(Math.max(value, minSize), maxSize);
}

export function resolveDraggedSplitSize(params: DraggedSplitSizeParams): number {
  const directionalDelta = params.anchor === 'end'
    ? -params.delta
    : params.delta;

  return clampSize(
    params.startSize + directionalDelta,
    params.minSize,
    params.maxSize,
  );
}
