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
  baseCountryFillColor: string;
  baseCountryFillOpacity: number;
  baseCountryOutlineColor: string;
  baseCountryOutlineWidth: number;
  baseCountryOutlineOpacity: number;
  baseCountryGlowColor: string;
  baseCountryGlowWidth: number;
  baseCountryGlowOpacity: number;
  activeCountryCodes: string[];
  countryCenterOverrides: Record<string, CountryCenterPoint>;
  threatColorsEnabled: boolean;
  threatFillOpacity: number;
  threatOutlineVisible: boolean;
  threatOutlineNeutralColor: string;
  threatOutlineWidth: number;
  threatOutlineOpacity: number;
  threatGlowNeutralColor: string;
  threatGlowWidth: number;
  threatGlowOpacity: number;
  hoverFillColor: string;
  hoverFillOpacity: number;
  hoverThreatFillOpacity: number;
  hoverGlowColor: string;
  hoverGlowWidth: number;
  hoverGlowOpacity: number;
  hoverThreatGlowOpacity: number;
  hoverBorderColor: string;
  hoverBorderWidth: number;
  hoverBorderOpacity: number;
  hoverThreatBorderOpacity: number;
  attackArc: AttackArcDebugSettings;
}

export interface CountryCenterPoint {
  lon: number;
  lat: number;
}

export type ArcLengthPreset = 'short' | 'medium' | 'long';
export type AttackArcStagePreset = 'stage1' | 'stage2' | 'stage3';
export type AttackArcVisualLevel = 'low' | 'medium' | 'high' | 'critical' | 'active';

export interface AttackArcLengthThresholds {
  shortMax: number;
  mediumMax: number;
}

export interface AttackArcStageSettings {
  lineAlpha: number;
  ringAlpha: number;
  dotAlpha: number;
  ringRadius: number;
  ringCount: number;
  ringSpacing: number;
  ringLineWidth: number;
  ringDotRadius: number;
}

export interface AttackArcVisualStyle {
  lineColor: string;
  ringColor: string;
  dotColor: string;
}

export interface AttackArcResolvedStageSettings extends AttackArcStageSettings, AttackArcVisualStyle {
  curvatureRatio: number;
  bundleSpreadRatio: number;
  lineWidth: number;
  segmentCount: number;
}

export interface AttackArcLengthPresetSettings {
  bundleCount: number;
  flightDuration: number;
  holdDuration: number;
  fadeoutDuration: number;
  replayDelayMs: number;
  bundleIntervalMs: number;
  maxConcurrentStarts: number;
  bundleSpreadRatio: number;
  curvatureRatio: number;
  lineWidth: number;
  segmentCount: number;
  style: AttackArcVisualStyle;
  stages: Record<AttackArcStagePreset, AttackArcStageSettings>;
}

export interface AttackArcDebugSettings {
  lengthThresholds: AttackArcLengthThresholds;
  presets: Record<ArcLengthPreset, AttackArcLengthPresetSettings>;
}

export interface AttackArcConfigState {
  isValid: boolean;
  errorMessage: string | null;
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
