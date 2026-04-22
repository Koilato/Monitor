import type { PopupAnchor } from 'map/state/map-types';

export function createHoverAnchor(mode: '2d' | '3d', x: number, y: number): PopupAnchor {
  return {
    x,
    y,
    mode,
    placement: x >= window.innerWidth / 2 ? 'left' : 'right',
  };
}
