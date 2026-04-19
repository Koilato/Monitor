import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';

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
  contentPaddingX: number;
}

export interface MapDebugThreeDSettings {
  povLng: number;
  povLat: number;
  povAltitude: number;
}

export interface MapDebugSettings {
  latestSectionHeight: number;
  twoD: MapDebugTwoDSettings;
  threeD: MapDebugThreeDSettings;
}

export const DEFAULT_MAP_DEBUG_SETTINGS: MapDebugSettings = {
  latestSectionHeight: 160,
  twoD: {
    centerLng: 0,
    centerLat: 0,
    zoom: 0,
    minZoom: -2,
    maxZoom: 6,
    contentPaddingX: 0,
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
  threatData: ThreatMapResponse | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  debugSettings: MapDebugSettings;
}
