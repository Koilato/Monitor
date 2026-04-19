import type { CountryHoverResponse } from '@shared/types';

export interface HoverCountryState {
  code: string;
  name: string;
}

interface PopupAnchorBase {
  x: number;
  y: number;
  placement: 'left' | 'right';
}

export interface PopupAnchor2D extends PopupAnchorBase {
  mode: '2d';
}

export interface PopupAnchor3D extends PopupAnchorBase {
  mode: '3d';
}

export type PopupAnchor = PopupAnchor2D | PopupAnchor3D;

export interface CountryHoverEvent {
  country: HoverCountryState | null;
  anchor: PopupAnchor | null;
}

export interface MapDebugTwoDSettings {
  centerLng: number;
  centerLat: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface MapDebugThreeDSettings {
  povLng: number;
  povLat: number;
  povAltitude: number;
}

export interface MapDebugSettings {
  viewportPadding: number;
  twoD: MapDebugTwoDSettings;
  threeD: MapDebugThreeDSettings;
}

export const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  viewportPadding: 0,
  twoD: {
    centerLng: 12,
    centerLat: 18,
    zoom: 0.92,
    minZoom: 0.5,
    maxZoom: 6,
  },
  threeD: {
    povLng: 105,
    povLat: 24,
    povAltitude: 2.45,
  },
};

export interface MapViewProps {
  hoveredCountryCode: string | null;
  data: CountryHoverResponse | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  debugSettings: MapDebugSettings;
}
