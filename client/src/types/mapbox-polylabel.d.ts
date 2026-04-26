declare module '@mapbox/polylabel' {
  type PolylabelPoint = [number, number];

  export default function polylabel(
    polygon: PolylabelPoint[][],
    precision?: number,
    debug?: boolean,
  ): PolylabelPoint;
}
