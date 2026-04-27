import type maplibregl from 'maplibre-gl';

import { getThreatVisualToken, type ThreatVisualLevel } from 'map/layers/tokens';
import type { MapDebugSettings } from 'map/state/map-types';
import { rgbaStringToDeckColor } from 'shared/styles/color-utils';

export const BASE_COUNTRY_PATTERN_LAYER_ID = 'countries-base-pattern';
export const THREAT_PATTERN_LAYER_ID = 'countries-threat-pattern';

export const COUNTRY_DOT_PATTERN_BASE_IMAGE_ID = 'country-dot-pattern-base';
export const COUNTRY_DOT_PATTERN_FALLBACK_IMAGE_ID = 'country-dot-pattern-fallback';
export const COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID = 'country-dot-pattern-transparent';

const THREAT_PATTERN_IMAGE_IDS: Record<Exclude<ThreatVisualLevel, 'none'>, string> = {
  low: 'country-dot-pattern-threat-low',
  medium: 'country-dot-pattern-threat-medium',
  high: 'country-dot-pattern-threat-high',
  critical: 'country-dot-pattern-threat-high',
};

const DOT_PATTERN_MIN_DENSITY = 8;
const DOT_PATTERN_MAX_DENSITY = 24;
const DOT_PATTERN_BASE_RADIUS_RATIO = 0.28;

type PatternImageDefinition = {
  id: string;
  color: string;
  density: number;
  opacity: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseHexChannel(value: string): number {
  return Number.parseInt(value, 16);
}

function resolveColorToRgb(color: string): [number, number, number] {
  if (color.trim().startsWith('#')) {
    const normalized = color.trim().toLowerCase();
    return [
      parseHexChannel(normalized.slice(1, 3)),
      parseHexChannel(normalized.slice(3, 5)),
      parseHexChannel(normalized.slice(5, 7)),
    ];
  }

  const [red, green, blue] = rgbaStringToDeckColor(color);
  return [red, green, blue];
}

function createTransparentImageData(size: number) {
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
  };
}

export function createDotPatternImageData(color: string, density: number, opacity: number) {
  const size = Math.round(clamp(density, DOT_PATTERN_MIN_DENSITY, DOT_PATTERN_MAX_DENSITY));
  const alpha = Math.round(clamp(opacity, 0, 1) * 255);

  if (alpha <= 0) {
    return createTransparentImageData(size);
  }

  const [red, green, blue] = resolveColorToRgb(color);
  const center = (size - 1) / 2;
  const radius = Math.max(2, size * DOT_PATTERN_BASE_RADIUS_RATIO);
  const antialiasBand = 1.15;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt((dx * dx) + (dy * dy));
      const edgeAlpha = clamp((radius + antialiasBand - distance) / antialiasBand, 0, 1);
      if (edgeAlpha <= 0) {
        continue;
      }

      const index = ((y * size) + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = Math.round(alpha * edgeAlpha);
    }
  }

  return {
    width: size,
    height: size,
    data,
  };
}

function getThreatPatternImageId(level: Exclude<ThreatVisualLevel, 'none'>): string {
  return THREAT_PATTERN_IMAGE_IDS[level];
}

function buildPatternImageDefinitions(settings: MapDebugSettings): PatternImageDefinition[] {
  return [
    {
      id: COUNTRY_DOT_PATTERN_BASE_IMAGE_ID,
      color: settings.countryDotPatternColor,
      density: settings.countryDotPatternDensity,
      opacity: settings.countryDotPatternOpacity,
    },
    {
      id: COUNTRY_DOT_PATTERN_FALLBACK_IMAGE_ID,
      color: settings.countryDotPatternColor,
      density: settings.countryDotPatternDensity,
      opacity: settings.countryDotPatternOpacity,
    },
    {
      id: getThreatPatternImageId('low'),
      color: getThreatVisualToken('low').fill,
      density: settings.countryDotPatternDensity,
      opacity: settings.countryDotPatternOpacity,
    },
    {
      id: getThreatPatternImageId('medium'),
      color: getThreatVisualToken('medium').fill,
      density: settings.countryDotPatternDensity,
      opacity: settings.countryDotPatternOpacity,
    },
    {
      id: getThreatPatternImageId('critical'),
      color: getThreatVisualToken('critical').fill,
      density: settings.countryDotPatternDensity,
      opacity: settings.countryDotPatternOpacity,
    },
  ];
}

type PatternCapableMap = Pick<maplibregl.Map, 'hasImage' | 'addImage' | 'removeImage'>;

function isPatternCapableMap(map: maplibregl.Map): map is maplibregl.Map & PatternCapableMap {
  return typeof (map as PatternCapableMap).hasImage === 'function'
    && typeof (map as PatternCapableMap).addImage === 'function'
    && typeof (map as PatternCapableMap).removeImage === 'function';
}

function replaceImage(map: maplibregl.Map & PatternCapableMap, id: string, imageData: {
  width: number;
  height: number;
  data: Uint8Array;
}) {
  if (map.hasImage(id)) {
    map.removeImage(id);
  }

  map.addImage(id, imageData);
}

export function syncCountryDotPatternImages(map: maplibregl.Map, settings: MapDebugSettings) {
  if (!isPatternCapableMap(map)) {
    return;
  }

  const transparentImage = createTransparentImageData(settings.countryDotPatternDensity);
  replaceImage(map, COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID, transparentImage);

  for (const pattern of buildPatternImageDefinitions(settings)) {
    const imageData = createDotPatternImageData(pattern.color, pattern.density, pattern.opacity);
    replaceImage(map, pattern.id, imageData);
  }
}

export function resolveThreatPatternImageId(
  level: Exclude<ThreatVisualLevel, 'none'>,
  threatColorsEnabled: boolean,
): string {
  return threatColorsEnabled
    ? getThreatPatternImageId(level)
    : COUNTRY_DOT_PATTERN_FALLBACK_IMAGE_ID;
}
