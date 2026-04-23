import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';

import { clampSize, resolveDraggedSplitSize } from 'shell/lib/split-size';

export interface WorkspaceBounds {
  width: number;
  height: number;
}

export interface WorkspaceLayoutSnapshot {
  hasWorkspaceBounds: boolean;
  maxRightColumnWidth: number;
  maxBottomPanelHeight: number;
  clampedRightColumnWidth: number;
  clampedLeftBottomHeight: number;
  clampedLatestSectionHeight: number;
}

export interface ResizeDragEnvironment {
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  document: Pick<Document, 'body'>;
}

export interface BeginResizeDragOptions {
  axis: 'x' | 'y';
  anchor: 'start' | 'end';
  startSize: number;
  minSize: number;
  maxSize: number;
  startClientPosition: number;
  onResize: (size: number) => void;
  onFinish?: () => void;
}

export interface UseWorkspaceLayoutResult {
  workspaceRef: RefObject<HTMLDivElement | null>;
  latestSectionRef: RefObject<HTMLElement | null>;
  clampedRightColumnWidth: number;
  clampedLeftBottomHeight: number;
  clampedLatestSectionHeight: number;
  handleOuterDividerMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handleLeftDividerMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handleRightDividerMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const OUTER_DIVIDER_SIZE = 8;
const INNER_DIVIDER_SIZE = 8;
const MIN_LEFT_COLUMN_WIDTH = 300;
const MIN_RIGHT_COLUMN_WIDTH = 480;
const MIN_TOP_PANEL_HEIGHT = 180;
const MIN_BOTTOM_PANEL_HEIGHT = 120;
const DEFAULT_LEFT_BOTTOM_HEIGHT = 180;
const DEFAULT_RIGHT_COLUMN_WIDTH = 720;

function getInitialRightColumnWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_RIGHT_COLUMN_WIDTH;
  }

  return Math.round(window.innerWidth * 0.66);
}

function measureWorkspaceBounds(element: HTMLElement): WorkspaceBounds {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function resolveWorkspaceLayout(
  workspaceBounds: WorkspaceBounds,
  rightColumnWidth: number,
  leftBottomHeight: number,
  latestSectionHeight: number,
): WorkspaceLayoutSnapshot {
  const hasWorkspaceBounds = workspaceBounds.width > 0 && workspaceBounds.height > 0;
  const maxRightColumnWidth = hasWorkspaceBounds
    ? Math.max(
      MIN_RIGHT_COLUMN_WIDTH,
      workspaceBounds.width - MIN_LEFT_COLUMN_WIDTH - OUTER_DIVIDER_SIZE,
    )
    : rightColumnWidth;
  const maxBottomPanelHeight = hasWorkspaceBounds
    ? Math.max(
      MIN_BOTTOM_PANEL_HEIGHT,
      workspaceBounds.height - MIN_TOP_PANEL_HEIGHT - INNER_DIVIDER_SIZE,
    )
    : leftBottomHeight;

  return {
    hasWorkspaceBounds,
    maxRightColumnWidth,
    maxBottomPanelHeight,
    clampedRightColumnWidth: hasWorkspaceBounds
      ? clampSize(rightColumnWidth, MIN_RIGHT_COLUMN_WIDTH, maxRightColumnWidth)
      : rightColumnWidth,
    clampedLeftBottomHeight: hasWorkspaceBounds
      ? clampSize(leftBottomHeight, MIN_BOTTOM_PANEL_HEIGHT, maxBottomPanelHeight)
      : leftBottomHeight,
    clampedLatestSectionHeight: hasWorkspaceBounds
      ? clampSize(latestSectionHeight, MIN_BOTTOM_PANEL_HEIGHT, maxBottomPanelHeight)
      : latestSectionHeight,
  };
}

export function beginResizeDrag(
  environment: ResizeDragEnvironment,
  options: BeginResizeDragOptions,
): () => void {
  const previousCursor = environment.document.body.style.cursor;
  const previousUserSelect = environment.document.body.style.userSelect;
  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }

    finished = true;
    environment.document.body.style.cursor = previousCursor;
    environment.document.body.style.userSelect = previousUserSelect;
    environment.window.removeEventListener('mousemove', handlePointerMove);
    environment.window.removeEventListener('mouseup', handlePointerUp);
    options.onFinish?.();
  };

  const handlePointerMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();

    const delta = options.axis === 'x'
      ? moveEvent.clientX - options.startClientPosition
      : moveEvent.clientY - options.startClientPosition;

    options.onResize(resolveDraggedSplitSize({
      startSize: options.startSize,
      delta,
      minSize: options.minSize,
      maxSize: options.maxSize,
      anchor: options.anchor,
    }));
  };

  const handlePointerUp = () => {
    finish();
  };

  environment.document.body.style.cursor = options.axis === 'x' ? 'col-resize' : 'row-resize';
  environment.document.body.style.userSelect = 'none';
  environment.window.addEventListener('mousemove', handlePointerMove);
  environment.window.addEventListener('mouseup', handlePointerUp);

  return finish;
}

export function useWorkspaceLayout(
  latestSectionHeight: number,
  updateLatestSectionHeight: (value: number) => void,
): UseWorkspaceLayoutResult {
  const [rightColumnWidth, setRightColumnWidth] = useState(() => getInitialRightColumnWidth());
  const [leftBottomHeight, setLeftBottomHeight] = useState(DEFAULT_LEFT_BOTTOM_HEIGHT);
  const [workspaceBounds, setWorkspaceBounds] = useState<WorkspaceBounds>({
    width: 0,
    height: 0,
  });
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const latestSectionRef = useRef<HTMLElement | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const layout = resolveWorkspaceLayout(
    workspaceBounds,
    rightColumnWidth,
    leftBottomHeight,
    latestSectionHeight,
  );

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateBounds = () => {
      const nextBounds = measureWorkspaceBounds(element);
      setWorkspaceBounds((current) => (
        current.width === nextBounds.width && current.height === nextBounds.height
          ? current
          : nextBounds
      ));
    };

    updateBounds();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBounds);
      return () => window.removeEventListener('resize', updateBounds);
    }

    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);
    window.addEventListener('resize', updateBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  useEffect(() => () => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
  }, []);

  useEffect(() => {
    if (!layout.hasWorkspaceBounds) {
      return;
    }

    setRightColumnWidth((current) => (
      clampSize(current, MIN_RIGHT_COLUMN_WIDTH, layout.maxRightColumnWidth)
    ));
    setLeftBottomHeight((current) => (
      clampSize(current, MIN_BOTTOM_PANEL_HEIGHT, layout.maxBottomPanelHeight)
    ));

    if (layout.clampedLatestSectionHeight !== latestSectionHeight) {
      updateLatestSectionHeight(layout.clampedLatestSectionHeight);
    }
  }, [
    latestSectionHeight,
    layout.clampedLatestSectionHeight,
    layout.hasWorkspaceBounds,
    layout.maxBottomPanelHeight,
    layout.maxRightColumnWidth,
    updateLatestSectionHeight,
  ]);

  const startDrag = (
    axis: 'x' | 'y',
    anchor: 'start' | 'end',
    startSize: number,
    minSize: number,
    maxSize: number,
    startClientPosition: number,
    onResize: (size: number) => void,
  ) => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = beginResizeDrag(
      { window, document },
      {
        axis,
        anchor,
        startSize,
        minSize,
        maxSize,
        startClientPosition,
        onResize,
        onFinish: () => {
          dragCleanupRef.current = null;
        },
      },
    );
  };

  const handleOuterDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    startDrag(
      'x',
      'end',
      layout.clampedRightColumnWidth,
      MIN_RIGHT_COLUMN_WIDTH,
      layout.maxRightColumnWidth,
      event.clientX,
      setRightColumnWidth,
    );
  };

  const handleLeftDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    startDrag(
      'y',
      'end',
      layout.clampedLeftBottomHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      layout.maxBottomPanelHeight,
      event.clientY,
      setLeftBottomHeight,
    );
  };

  const handleRightDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    startDrag(
      'y',
      'end',
      layout.clampedLatestSectionHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      layout.maxBottomPanelHeight,
      event.clientY,
      updateLatestSectionHeight,
    );
  };

  return {
    workspaceRef,
    latestSectionRef,
    clampedRightColumnWidth: layout.clampedRightColumnWidth,
    clampedLeftBottomHeight: layout.clampedLeftBottomHeight,
    clampedLatestSectionHeight: layout.clampedLatestSectionHeight,
    handleOuterDividerMouseDown,
    handleLeftDividerMouseDown,
    handleRightDividerMouseDown,
  };
}
