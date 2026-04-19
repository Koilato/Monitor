import type { CountryHoverResponse } from '@shared/types';

export interface HoverCountryState {
  code: string;
  name: string;
}

export interface PopupAnchor {
  x: number;
  y: number;
  mode: '2d' | '3d';
  placement: 'left' | 'right';
}

export interface CountryHoverEvent {
  country: HoverCountryState | null;
  anchor: PopupAnchor | null;
}

export interface MapViewProps {
  hoveredCountryCode: string | null;
  data: CountryHoverResponse | null;
  onCountryHover: (event: CountryHoverEvent) => void;
}
