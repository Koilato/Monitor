import type { PopupAnchor } from 'map/state/map-types';

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 480;
const EDGE_MARGIN = 16;
const TOP_OFFSET_BY_MODE = {
  '2d': 140,
  '3d': 200,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPopupPosition(anchor: PopupAnchor) {
  const maxLeft = window.innerWidth - POPUP_WIDTH - EDGE_MARGIN;
  const maxTop = window.innerHeight - POPUP_HEIGHT - EDGE_MARGIN;
  const minTop = anchor.mode === '3d' ? 96 : 88;

  return {
    left: anchor.placement === 'left' ? EDGE_MARGIN : maxLeft,
    top: clamp(anchor.y - TOP_OFFSET_BY_MODE[anchor.mode], minTop, maxTop),
  };
}
