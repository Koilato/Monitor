import type { PopupAnchor } from 'map/state/map-types';

export function createHoverAnchor(x: number, y: number): PopupAnchor {
  return {
    x,
    y,
    mode: '2d',
    placement: x >= window.innerWidth / 2 ? 'left' : 'right',
  };
}
