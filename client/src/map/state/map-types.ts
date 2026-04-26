import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';

import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapCameraState, MapState } from './map-state';
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

export type PopupAnchor = PopupAnchor2D;

export interface CountryHoverEvent {
  country: HoverCountryState | null;
  anchor: PopupAnchor | null;
}

export interface MapDebugSettings {
  latestSectionHeight: number;
  minZoom: number;
  maxZoom: number;
  activeCountryCodes: string[];
  countryCenterOverrides: Record<string, CountryCenterPoint>;
  threatColorsEnabled: boolean;
  threatOutlineVisible: boolean;
  threatOutlineWidth: number;
  attackArc: AttackArcDebugSettings;
}

export interface CountryCenterPoint {
  lon: number;
  lat: number;
}

export type ArcLengthPreset = 'short' | 'medium' | 'long';

export interface AttackArcLengthThresholds {
  shortMax: number;
  mediumMax: number;
}

export interface AttackArcLengthPresetSettings {
  curvatureRatio: number;
  bundleSpreadRatio: number;
  lineWidth: number;
  segmentCount: number;
}

export interface AttackArcDebugSettings {
  bundleCount: number;
  lengthThresholds: AttackArcLengthThresholds;
  lengthPresets: Record<ArcLengthPreset, AttackArcLengthPresetSettings>;
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
}

export interface MapViewProps {
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
