export interface DraggedSplitSizeParams {
  startSize: number;
  delta: number;
  minSize: number;
  maxSize: number;
}

export function clampSize(value: number, minSize: number, maxSize: number): number {
  return Math.min(Math.max(value, minSize), maxSize);
}

export function resolveDraggedSplitSize(params: DraggedSplitSizeParams): number {
  return clampSize(
    params.startSize + params.delta,
    params.minSize,
    params.maxSize,
  );
}
