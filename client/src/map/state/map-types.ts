import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';

import type { MapCameraState, MapState, MapViewMode } from './map-state';

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

export interface MapDebugSettings {
  latestSectionHeight: number;
  minZoom: number;
  maxZoom: number;
}

export interface MapViewProps {
  viewMode: MapViewMode;
  mapState: MapState;
  hoveredCountryCode: string | null;
  data: CountryHoverResponse | null;
  threatData: ThreatMapResponse | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  onCameraChange: (camera: Partial<MapCameraState>) => void;
  debugSettings: MapDebugSettings;
}
