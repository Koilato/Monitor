import './theme.css';

import { useSyncExternalStore } from 'react';

import {
  deckColorToRgbaString,
  normalizeCssColor,
  rgbaStringToDeckColor,
  scaleDeckColorAlpha,
} from 'shared/styles/color-utils';

export interface ThreatVisualLayerToken {
  fill: string;
  stroke: string;
  glow: string;
  arc: string;
}

export type ThreatThemeLevel = 'low' | 'medium' | 'high';

interface ThemePalette {
  low: ThreatVisualLayerToken;
  medium: ThreatVisualLayerToken;
  high: ThreatVisualLayerToken;
}

const DEFAULT_THEME_LEVEL_COLORS: Record<ThreatThemeLevel, string> = {
  low: 'rgba(82, 214, 255, 0.76)',
  medium: 'rgba(255, 215, 120, 0.84)',
  high: 'rgba(255, 150, 110, 0.9)',
};

const THREAT_LEVEL_ALPHA_FACTORS: Record<ThreatThemeLevel, { fill: number; glow: number; arc: number }> = {
  low: {
    fill: 0.21052631578947367,
    glow: 0.18421052631578946,
    arc: 0.9473684210526315,
  },
  medium: {
    fill: 0.23809523809523808,
    glow: 0.23809523809523808,
    arc: 0.9047619047619048,
  },
  high: {
    fill: 0.26666666666666666,
    glow: 0.28888888888888886,
    arc: 0.9111111111111111,
  },
};

const THEME_CSS_VARIABLES: Record<ThreatThemeLevel, string> = {
  low: '--threat-low',
  medium: '--threat-medium',
  high: '--threat-high',
};

let currentThemePalette = readThemePalette();
let themeRevision = 0;
const themeListeners = new Set<() => void>();

function readThemeColor(level: ThreatThemeLevel): string {
  if (typeof document === 'undefined') {
    return DEFAULT_THEME_LEVEL_COLORS[level];
  }

  const cssValue = window.getComputedStyle(document.documentElement).getPropertyValue(THEME_CSS_VARIABLES[level]).trim();
  if (!cssValue) {
    return DEFAULT_THEME_LEVEL_COLORS[level];
  }

  return normalizeCssColor(cssValue) || DEFAULT_THEME_LEVEL_COLORS[level];
}

function buildThreatVisualToken(baseColor: string, level: ThreatThemeLevel): ThreatVisualLayerToken {
  const deckColor = rgbaStringToDeckColor(baseColor);
  const factors = THREAT_LEVEL_ALPHA_FACTORS[level];

  return {
    fill: deckColorToRgbaString(scaleDeckColorAlpha(deckColor, factors.fill)),
    stroke: deckColorToRgbaString(deckColor),
    glow: deckColorToRgbaString(scaleDeckColorAlpha(deckColor, factors.glow)),
    arc: deckColorToRgbaString(scaleDeckColorAlpha(deckColor, factors.arc)),
  };
}

function readThemePalette(): ThemePalette {
  return {
    low: buildThreatVisualToken(readThemeColor('low'), 'low'),
    medium: buildThreatVisualToken(readThemeColor('medium'), 'medium'),
    high: buildThreatVisualToken(readThemeColor('high'), 'high'),
  };
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function refreshThemePalette() {
  currentThemePalette = readThemePalette();
  themeRevision += 1;
  notifyThemeListeners();
}

if (typeof window !== 'undefined') {
  refreshThemePalette();
}

if (import.meta.hot) {
  import.meta.hot.accept('./theme.css', () => {
    refreshThemePalette();
  });
}

export function getThreatVisualToken(level: ThreatThemeLevel): ThreatVisualLayerToken {
  return currentThemePalette[level];
}

export function getThemeRevision(): number {
  return themeRevision;
}

export function subscribeThemeRevision(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function useThemeRevision(): number {
  return useSyncExternalStore(subscribeThemeRevision, getThemeRevision, getThemeRevision);
}
