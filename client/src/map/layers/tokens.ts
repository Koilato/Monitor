import type { EventLevel } from '@shared/types';

import type { LayerLegendDefinition } from 'map/layers/registry';

export type ThreatVisualLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'active';

export interface ThreatVisualLayerToken {
  fill: string;
  stroke: string;
  glow: string;
  arc: string;
}

export type DeckColor = [number, number, number, number];

const NONE_TOKEN: ThreatVisualLayerToken = {
  fill: 'rgba(0,0,0,0)',
  stroke: 'rgba(0,0,0,0)',
  glow: 'rgba(0,0,0,0)',
  arc: 'rgba(0,0,0,0)',
};

export const THREAT_VISUAL_LEVEL_TOKENS: Record<ThreatVisualLevel, ThreatVisualLayerToken> = {
  none: NONE_TOKEN,
  low: {
    fill: 'rgba(52,200,255,0.16)',
    stroke: 'rgba(82,214,255,0.76)',
    glow: 'rgba(52,200,255,0.14)',
    arc: 'rgba(82,214,255,0.72)',
  },
  medium: {
    fill: 'rgba(255,200,87,0.20)',
    stroke: 'rgba(255,215,120,0.84)',
    glow: 'rgba(255,200,87,0.20)',
    arc: 'rgba(255,215,120,0.76)',
  },
  high: {
    fill: 'rgba(255,122,69,0.24)',
    stroke: 'rgba(255,150,110,0.90)',
    glow: 'rgba(255,122,69,0.26)',
    arc: 'rgba(255,140,90,0.82)',
  },
  critical: {
    fill: 'rgba(255,61,87,0.28)',
    stroke: 'rgba(255,95,116,0.96)',
    glow: 'rgba(255,61,87,0.34)',
    arc: 'rgba(255,95,116,0.90)',
  },
  active: {
    fill: 'rgba(201,60,255,0.22)',
    stroke: 'rgba(220,120,255,0.98)',
    glow: 'rgba(201,60,255,0.40)',
    arc: 'rgba(220,120,255,0.92)',
  },
};

const EVENT_LEVEL_TO_VISUAL_LEVEL: Record<EventLevel, ThreatVisualLevel> = {
  low: 'low',
  medium: 'medium',
  high: 'critical',
};

function normalizeCountryCode(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

function normalizeCountryCodeSet(countryCodes: readonly string[]): Set<string> {
  return new Set(
    countryCodes
      .map((countryCode) => normalizeCountryCode(countryCode))
      .filter((countryCode) => /^[A-Z]{2}$/.test(countryCode)),
  );
}

export function createActiveCountryCodeSet(countryCodes: readonly string[]): Set<string> {
  return normalizeCountryCodeSet(countryCodes);
}

export function resolveThreatVisualLevel(
  level: EventLevel,
  countryCode: string | null | undefined,
  activeCountryCodes: readonly string[],
  activeCountryCodeSet?: ReadonlySet<string>,
): ThreatVisualLevel {
  const baseVisualLevel = EVENT_LEVEL_TO_VISUAL_LEVEL[level];
  if (!countryCode) {
    return baseVisualLevel;
  }

  const normalizedCode = normalizeCountryCode(countryCode);
  if (!normalizedCode) {
    return baseVisualLevel;
  }

  const activeOverrideSet = activeCountryCodeSet ?? normalizeCountryCodeSet(activeCountryCodes);
  return activeOverrideSet.has(normalizedCode)
    ? 'active'
    : baseVisualLevel;
}

export function getThreatVisualToken(level: ThreatVisualLevel): ThreatVisualLayerToken {
  return THREAT_VISUAL_LEVEL_TOKENS[level];
}

const RGBA_COLOR_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*((?:\d+\.?\d*)|(?:\d*\.\d+))\s*\)$/i;

export function rgbaStringToDeckColor(color: string): DeckColor {
  const match = color.match(RGBA_COLOR_PATTERN);
  if (!match) {
    return [255, 255, 255, 255];
  }

  const red = Math.min(255, Math.max(0, Number(match[1])));
  const green = Math.min(255, Math.max(0, Number(match[2])));
  const blue = Math.min(255, Math.max(0, Number(match[3])));
  const alpha = Math.min(1, Math.max(0, Number(match[4])));

  return [red, green, blue, Math.round(alpha * 255)];
}

export function scaleDeckColorAlpha(color: DeckColor, factor: number): DeckColor {
  const alpha = Math.round(Math.min(255, Math.max(0, color[3] * factor)));
  return [color[0], color[1], color[2], alpha];
}

export const THREAT_LEGEND: LayerLegendDefinition = {
  label: 'Threat',
  items: [
    { label: 'LOW', color: THREAT_VISUAL_LEVEL_TOKENS.low.stroke },
    { label: 'MED', color: THREAT_VISUAL_LEVEL_TOKENS.medium.stroke },
    { label: 'HIGH', color: THREAT_VISUAL_LEVEL_TOKENS.critical.stroke },
    { label: 'ACTIVE', color: THREAT_VISUAL_LEVEL_TOKENS.active.stroke },
  ],
};

export const COUNTRY_BASE_FILL_COLOR = '#141414';
export const COUNTRY_BASE_FILL_OPACITY = 1;
export const COUNTRY_BASE_LINE_COLOR = '#707070';
export const COUNTRY_BASE_LINE_WIDTH = 0.9;
export const COUNTRY_BASE_LINE_OPACITY = 1;
export const COUNTRY_BASE_GLOW_COLOR = '#707070';
export const COUNTRY_BASE_GLOW_WIDTH = 0;
export const COUNTRY_BASE_GLOW_OPACITY = 0;
export const COUNTRY_INTERACTIVE_FILL_COLOR = '#0f172a';

export const THREAT_FILL_OPACITY = 1;
export const THREAT_LINE_WIDTH = 1.7;
export const THREAT_LINE_OPACITY = 1;
export const THREAT_GLOW_WIDTH = 6.4;
export const THREAT_GLOW_OPACITY = 1;

export const HOVER_FILL_DEFAULT_COLOR = 'rgba(52,200,255,0.18)';
export const HOVER_FILL_INITIAL_COLOR = 'rgba(52,200,255,0.22)';
export const HOVER_FILL_DEFAULT_OPACITY = 1;
export const HOVER_FILL_THREAT_OPACITY = 1;
export const HOVER_FILL_INITIAL_OPACITY = 1;
export const HOVER_GLOW_DEFAULT_COLOR = 'rgba(52,200,255,0.28)';
export const HOVER_GLOW_INITIAL_COLOR = 'rgba(52,200,255,0.30)';
export const HOVER_GLOW_DEFAULT_OPACITY = 1;
export const HOVER_GLOW_THREAT_OPACITY = 1;
export const HOVER_GLOW_INITIAL_OPACITY = 1;
export const HOVER_GLOW_WIDTH = 5.5;
export const HOVER_BORDER_DEFAULT_COLOR = 'rgba(82,214,255,0.90)';
export const HOVER_BORDER_THREAT_COLOR = 'rgba(255,255,255,0.95)';
export const HOVER_BORDER_INITIAL_COLOR = 'rgba(82,214,255,0.90)';
export const HOVER_BORDER_WIDTH = 2.2;

export const ARROW_ICON_ATLAS = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path d="M8 32h30.5" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <path d="M32 22l16 10-16 10" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`)}`;
