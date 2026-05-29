import type { PopupAnchor } from 'map/state/map-types';

export function createPopupAnchor(x: number, y: number): PopupAnchor {
  return {
    x,
    y,
    mode: '2d',
    placement: x >= window.innerWidth / 2 ? 'left' : 'right',
  };
}
