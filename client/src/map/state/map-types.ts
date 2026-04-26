import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';

import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapCameraState, MapState, MapViewMode } from './map-state';
import type { FlowMode, FlowPlaybackMode } from './map-state';

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
  activeCountryCodes: string[];
  threatColorsEnabled: boolean;
  threatOutlineVisible: boolean;
  threatOutlineWidth: number;
  attackArc: AttackArcDebugSettings;
}

export interface AttackArcDebugSettings {
  bundleCount: number;
  bundleSpreadRatio: number;
  curvatureRatio: number;
  lineWidth: number;
  segmentCount: number;
  flightDuration: number;
  holdDuration: number;
  fadeoutDuration: number;
  replayDelayMs: number;
  bundleIntervalMs: number;
  maxConcurrentStarts: number;
  ringRadius: number;
  ringCount: number;
  ringSpacing: number;
  ringLineWidth: number;
  ringDotRadius: number;
  arcWidthScale3d: number;
  arrowSizeScale3d: number;
}

export interface MapViewProps {
  viewMode: MapViewMode;
  mapState: MapState;
  themeRevision: number;
  hoveredCountryCode: string | null;
  hoverData: CountryHoverResponse | null;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  flowMode: FlowMode;
  flowPlaybackMode: FlowPlaybackMode;
  onCountryHover: (event: CountryHoverEvent) => void;
  onCameraChange: (camera: Partial<MapCameraState>) => void;
  debugSettings: MapDebugSettings;
}
