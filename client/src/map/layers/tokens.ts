import type { ThreatLevel } from '@shared/types';

import type { LayerLegendDefinition } from 'map/layers/registry';

export const THREAT_LEVEL_COLORS: Record<ThreatLevel, string> = {
  none: 'rgba(0,0,0,0)',
  low: 'rgba(250,204,21,0.68)',
  medium: 'rgba(249,115,22,0.74)',
  high: 'rgba(239,68,68,0.78)',
  critical: 'rgba(185,28,28,0.82)',
};

export const THREAT_LEVEL_OUTLINE_COLORS: Record<ThreatLevel, string> = {
  none: 'rgba(0,0,0,0)',
  low: 'rgba(250,204,21,0.94)',
  medium: 'rgba(249,115,22,0.96)',
  high: 'rgba(239,68,68,0.98)',
  critical: 'rgba(185,28,28,1)',
};

export const THREAT_LEGEND: LayerLegendDefinition = {
  label: 'Threat',
  items: [
    { label: 'LOW', color: THREAT_LEVEL_COLORS.low },
    { label: 'MED', color: THREAT_LEVEL_COLORS.medium },
    { label: 'HIGH', color: THREAT_LEVEL_COLORS.high },
    { label: 'CRIT', color: THREAT_LEVEL_COLORS.critical },
  ],
};

export const COUNTRY_BASE_FILL_COLOR = '#1C2026';
export const COUNTRY_BASE_FILL_OPACITY = 1;
export const COUNTRY_BASE_LINE_COLOR = '#5A5F64';
export const COUNTRY_BASE_LINE_WIDTH = 0.9;
export const COUNTRY_BASE_LINE_OPACITY = 1;
export const COUNTRY_BASE_GLOW_COLOR = '#5A5F64';
export const COUNTRY_BASE_GLOW_WIDTH = 0;
export const COUNTRY_BASE_GLOW_OPACITY = 0;
export const COUNTRY_INTERACTIVE_FILL_COLOR = '#0f172a';

export const THREAT_FILL_OPACITY = 1;
export const THREAT_LINE_WIDTH = 1.7;
export const THREAT_LINE_OPACITY = 1;

export const HOVER_FILL_DEFAULT_COLOR = 'rgba(96, 255, 182, 0.9)';
export const HOVER_FILL_INITIAL_COLOR = '#00ffaa';
export const HOVER_FILL_DEFAULT_OPACITY = 0.28;
export const HOVER_FILL_THREAT_OPACITY = 0.22;
export const HOVER_FILL_INITIAL_OPACITY = 0.3;
export const HOVER_GLOW_DEFAULT_COLOR = 'rgba(125, 255, 191, 0.95)';
export const HOVER_GLOW_INITIAL_COLOR = '#7dffbf';
export const HOVER_GLOW_DEFAULT_OPACITY = 0.32;
export const HOVER_GLOW_THREAT_OPACITY = 0.42;
export const HOVER_GLOW_INITIAL_OPACITY = 0.32;
export const HOVER_GLOW_WIDTH = 5.5;
export const HOVER_BORDER_DEFAULT_COLOR = 'rgba(68, 255, 136, 1)';
export const HOVER_BORDER_THREAT_COLOR = 'rgba(255, 255, 255, 0.95)';
export const HOVER_BORDER_INITIAL_COLOR = '#44ff88';
export const HOVER_BORDER_WIDTH = 2.2;

export const ATTACK_ARC_GLOW_SOURCE_COLOR = [56, 189, 248, 60] as const;
export const ATTACK_ARC_GLOW_TARGET_COLOR = [255, 72, 120, 95] as const;
export const ATTACK_ARC_SOURCE_COLOR = [56, 189, 248, 225] as const;
export const ATTACK_ARC_TARGET_COLOR = [255, 72, 120, 245] as const;
export const ATTACK_ARROWHEAD_COLOR = [255, 72, 120, 220] as const;

export const ARROW_ICON_ATLAS = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path d="M8 32h30.5" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <path d="M32 22l16 10-16 10" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`)}`;
