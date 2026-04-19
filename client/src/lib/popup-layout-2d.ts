import type { PopupAnchor2D } from './types';

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 480;
const EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getTwoDPopupPosition(anchor: PopupAnchor2D) {
  const maxLeft = window.innerWidth - POPUP_WIDTH - EDGE_MARGIN;
  const maxTop = window.innerHeight - POPUP_HEIGHT - EDGE_MARGIN;

  return {
    left: anchor.placement === 'left' ? EDGE_MARGIN : maxLeft,
    top: clamp(anchor.y - 140, 88, maxTop),
  };
}
