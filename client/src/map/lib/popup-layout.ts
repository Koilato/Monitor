import type { PopupAnchor } from 'map/state/map-types';

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 480;
const EDGE_MARGIN = 16;
const POINTER_GAP = 14;
const TOP_OFFSET = 32;
const LEGEND_WIDTH = 220;
const LEGEND_CLEARANCE = 72;

export interface PopupViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPopupPosition(anchor: PopupAnchor, viewport: PopupViewport) {
  const anchorX = anchor.x - viewport.left;
  const anchorY = anchor.y - viewport.top;
  const maxLeft = Math.max(EDGE_MARGIN, viewport.width - POPUP_WIDTH - EDGE_MARGIN);
  const rightLeft = anchorX + POINTER_GAP;
  const leftLeft = anchorX - POPUP_WIDTH - POINTER_GAP;
  const preferredLeft = rightLeft + POPUP_WIDTH + EDGE_MARGIN <= viewport.width
    ? rightLeft
    : leftLeft;
  const left = clamp(preferredLeft, EDGE_MARGIN, maxLeft);
  const bottomClearance = left < LEGEND_WIDTH ? LEGEND_CLEARANCE : 0;
  const availableHeight = Math.max(160, viewport.height - (EDGE_MARGIN * 2) - bottomClearance);
  const popupHeight = Math.min(POPUP_HEIGHT, availableHeight);
  const maxTop = Math.max(EDGE_MARGIN, viewport.height - popupHeight - EDGE_MARGIN - bottomClearance);

  return {
    left,
    top: clamp(anchorY - TOP_OFFSET, EDGE_MARGIN, maxTop),
    maxHeight: availableHeight,
  };
}
