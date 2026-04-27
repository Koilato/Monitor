import { getCountriesGeoJson } from 'map/lib/country-geometry';
import {
  BASE_COUNTRY_PATTERN_LAYER_ID,
  COUNTRY_DOT_PATTERN_BASE_IMAGE_ID,
  COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
  THREAT_PATTERN_LAYER_ID,
} from 'map/layers/patterns';
import type { LayerRenderContext } from 'map/layers/registry';
import type { FeatureCollection, Geometry, Position } from 'geojson';
import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_FILL_OPACITY,
  COUNTRY_BASE_GLOW_COLOR,
  COUNTRY_BASE_GLOW_OPACITY,
  COUNTRY_BASE_GLOW_WIDTH,
  COUNTRY_BASE_LINE_COLOR,
  COUNTRY_BASE_LINE_OPACITY,
  COUNTRY_BASE_LINE_WIDTH,
  COUNTRY_INTERACTIVE_FILL_COLOR,
  HOVER_BORDER_INITIAL_COLOR,
  HOVER_BORDER_WIDTH,
  HOVER_FILL_INITIAL_COLOR,
  HOVER_FILL_INITIAL_OPACITY,
  HOVER_GLOW_INITIAL_COLOR,
  HOVER_GLOW_INITIAL_OPACITY,
  HOVER_GLOW_WIDTH,
  THREAT_FILL_OPACITY,
  THREAT_GLOW_OPACITY,
  THREAT_GLOW_WIDTH,
  THREAT_LINE_OPACITY,
  THREAT_LINE_WIDTH,
} from 'map/layers/tokens';

export const COUNTRY_SOURCE_ID = 'countries';
export const COUNTRY_INTERNAL_BORDER_SOURCE_ID = 'countries-internal-borders';
export const COUNTRIES_BASE_LAYER_IDS = [
  'countries-base-fill',
  BASE_COUNTRY_PATTERN_LAYER_ID,
  'countries-base-line',
  'countries-base-glow',
  'countries-interactive',
] as const;
export const THREAT_FILL_LAYER_ID = 'countries-threat-fill';
export const THREAT_PATTERN_LAYER_IDS = [THREAT_FILL_LAYER_ID, THREAT_PATTERN_LAYER_ID] as const;
export const THREAT_OUTLINE_LAYER_ID = 'countries-threat-line';
export const THREAT_GLOW_LAYER_ID = 'countries-threat-glow';
export const HOVER_HIGHLIGHT_LAYER_IDS = [
  'countries-hover-fill',
  'countries-hover-glow',
  'countries-hover-border',
] as const;
export const EMPTY_FILTER: ['==', ['get', 'ISO3166-1-Alpha-2'], ''] = ['==', ['get', 'ISO3166-1-Alpha-2'], ''];

const HIDDEN_COUNTRY_CODES = new Set(['AQ']);
const COORDINATE_PRECISION = 6;

type Segment = [[number, number], [number, number]];

interface BoundarySegmentStat {
  count: number;
  segment: Segment;
}

function filterCountriesGeoJson(geojson: Awaited<ReturnType<typeof getCountriesGeoJson>>) {
  return {
    ...geojson,
    features: geojson.features.filter((feature) => {
      const code = feature.properties?.['ISO3166-1-Alpha-2'];
      return typeof code !== 'string' || !HIDDEN_COUNTRY_CODES.has(code);
    }),
  };
}

function toLngLat(position: Position | null | undefined): [number, number] | null {
  if (!Array.isArray(position) || position.length < 2) {
    return null;
  }

  const lon = Number(position[0]);
  const lat = Number(position[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return [lon, lat];
}

function collectRingSegments(ring: Position[]): Segment[] {
  if (ring.length < 2) {
    return [];
  }

  const segments: Segment[] = [];
  for (let index = 1; index < ring.length; index += 1) {
    const previous = toLngLat(ring[index - 1]);
    const current = toLngLat(ring[index]);
    if (!previous || !current) {
      continue;
    }
    if (previous[0] === current[0] && previous[1] === current[1]) {
      continue;
    }

    segments.push([previous, current]);
  }

  return segments;
}

function collectGeometrySegments(geometry: Geometry | null | undefined): Segment[] {
  if (!geometry) {
    return [];
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flatMap((ring) => collectRingSegments(ring));
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) => polygon.flatMap((ring) => collectRingSegments(ring)));
  }

  return [];
}

function toCoordinateKey(value: number): string {
  return value.toFixed(COORDINATE_PRECISION);
}

function toPointKey(point: [number, number]): string {
  return `${toCoordinateKey(point[0])},${toCoordinateKey(point[1])}`;
}

function toSegmentKey(segment: Segment): string {
  const start = toPointKey(segment[0]);
  const end = toPointKey(segment[1]);
  return start < end ? `${start}|${end}` : `${end}|${start}`;
}

export function buildInternalCountryBordersGeoJson(
  geojson: FeatureCollection<Geometry>,
): FeatureCollection<Geometry> {
  const segmentStats = new Map<string, BoundarySegmentStat>();
  for (const feature of geojson.features) {
    const segments = collectGeometrySegments(feature.geometry);
    for (const segment of segments) {
      const key = toSegmentKey(segment);
      const existing = segmentStats.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      segmentStats.set(key, {
        count: 1,
        segment,
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: [...segmentStats.values()]
      .filter(({ count }) => count > 1)
      .map(({ segment }) => ({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [segment[0], segment[1]],
        },
      })),
  };
}

export async function ensureCountrySource(context: LayerRenderContext) {
  const hasCountrySource = Boolean(context.map.getSource(COUNTRY_SOURCE_ID));
  const hasInternalBorderSource = Boolean(context.map.getSource(COUNTRY_INTERNAL_BORDER_SOURCE_ID));
  if (hasCountrySource && hasInternalBorderSource) {
    return;
  }

  const geojson = await getCountriesGeoJson();
  const filteredGeoJson = filterCountriesGeoJson(geojson);

  if (!hasCountrySource) {
    context.map.addSource(COUNTRY_SOURCE_ID, {
      type: 'geojson',
      data: filteredGeoJson,
    });
  }

  if (!hasInternalBorderSource) {
    context.map.addSource(COUNTRY_INTERNAL_BORDER_SOURCE_ID, {
      type: 'geojson',
      data: buildInternalCountryBordersGeoJson(filteredGeoJson),
    });
  }
}

export function addLayerIfMissing(
  context: LayerRenderContext,
  layer: Parameters<LayerRenderContext['map']['addLayer']>[0],
) {
  if (!context.map.getLayer(layer.id)) {
    context.map.addLayer(layer);
  }
}

export function buildCountryCodeFilter(code: string | null | undefined) {
  return code
    ? ['==', ['get', 'ISO3166-1-Alpha-2'], code] as const
    : EMPTY_FILTER;
}

export function registerCountriesBaseLayers(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[0],
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': COUNTRY_BASE_FILL_COLOR,
      'fill-opacity': COUNTRY_BASE_FILL_OPACITY,
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[1],
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-pattern': COUNTRY_DOT_PATTERN_BASE_IMAGE_ID,
      'fill-opacity': 1,
    },
    layout: {
      visibility: 'none',
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[2],
    type: 'line',
    source: COUNTRY_INTERNAL_BORDER_SOURCE_ID,
    paint: {
      'line-color': COUNTRY_BASE_LINE_COLOR,
      'line-width': COUNTRY_BASE_LINE_WIDTH,
      'line-opacity': COUNTRY_BASE_LINE_OPACITY,
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[3],
    type: 'line',
    source: COUNTRY_INTERNAL_BORDER_SOURCE_ID,
    paint: {
      'line-color': COUNTRY_BASE_GLOW_COLOR,
      'line-width': COUNTRY_BASE_GLOW_WIDTH,
      'line-opacity': COUNTRY_BASE_GLOW_OPACITY,
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[4],
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': COUNTRY_INTERACTIVE_FILL_COLOR,
      'fill-opacity': 0,
    },
  });
}

export function registerThreatFillLayer(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: THREAT_FILL_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': 'rgba(0,0,0,0)',
      'fill-opacity': THREAT_FILL_OPACITY,
    },
  });
}

export function registerThreatPatternLayer(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: THREAT_PATTERN_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-pattern': COUNTRY_DOT_PATTERN_TRANSPARENT_IMAGE_ID,
      'fill-opacity': 1,
    },
    layout: {
      visibility: 'none',
    },
  });
}

export function registerThreatOutlineLayer(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: THREAT_OUTLINE_LAYER_ID,
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': 'rgba(0,0,0,0)',
      'line-width': THREAT_LINE_WIDTH,
      'line-opacity': THREAT_LINE_OPACITY,
    },
  });
}

export function registerThreatGlowLayer(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: THREAT_GLOW_LAYER_ID,
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': 'rgba(0,0,0,0)',
      'line-width': THREAT_GLOW_WIDTH,
      'line-opacity': THREAT_GLOW_OPACITY,
      'line-blur': 1.1,
    },
  });
}

export function registerThreatHighlightLayers(context: LayerRenderContext) {
  registerThreatFillLayer(context);
  registerThreatPatternLayer(context);
  registerThreatOutlineLayer(context);
  registerThreatGlowLayer(context);
}

export function registerHoverHighlightLayers(context: LayerRenderContext) {
  addLayerIfMissing(context, {
    id: HOVER_HIGHLIGHT_LAYER_IDS[0],
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': HOVER_FILL_INITIAL_COLOR,
      'fill-opacity': HOVER_FILL_INITIAL_OPACITY,
    },
    filter: EMPTY_FILTER,
  });

  addLayerIfMissing(context, {
    id: HOVER_HIGHLIGHT_LAYER_IDS[1],
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': HOVER_GLOW_INITIAL_COLOR,
      'line-width': HOVER_GLOW_WIDTH,
      'line-opacity': HOVER_GLOW_INITIAL_OPACITY,
    },
    filter: EMPTY_FILTER,
  });

  addLayerIfMissing(context, {
    id: HOVER_HIGHLIGHT_LAYER_IDS[2],
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': HOVER_BORDER_INITIAL_COLOR,
      'line-width': HOVER_BORDER_WIDTH,
      'line-opacity': 1,
    },
    filter: EMPTY_FILTER,
  });
}
