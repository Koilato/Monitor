import { getCountriesGeoJson } from 'map/lib/country-geometry';
import type { LayerRenderContext } from 'map/layers/registry';
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
  THREAT_LINE_OPACITY,
  THREAT_LINE_WIDTH,
} from 'map/layers/tokens';

export const COUNTRY_SOURCE_ID = 'countries';
export const COUNTRIES_BASE_LAYER_IDS = [
  'countries-base-fill',
  'countries-base-line',
  'countries-base-glow',
  'countries-interactive',
] as const;
export const THREAT_FILL_LAYER_ID = 'countries-threat-fill';
export const THREAT_OUTLINE_LAYER_ID = 'countries-threat-line';
export const HOVER_HIGHLIGHT_LAYER_IDS = [
  'countries-hover-fill',
  'countries-hover-glow',
  'countries-hover-border',
] as const;
export const EMPTY_FILTER: ['==', ['get', 'ISO3166-1-Alpha-2'], ''] = ['==', ['get', 'ISO3166-1-Alpha-2'], ''];

const HIDDEN_COUNTRY_CODES = new Set(['AQ']);

function filterCountriesGeoJson(geojson: Awaited<ReturnType<typeof getCountriesGeoJson>>) {
  return {
    ...geojson,
    features: geojson.features.filter((feature) => {
      const code = feature.properties?.['ISO3166-1-Alpha-2'];
      return typeof code !== 'string' || !HIDDEN_COUNTRY_CODES.has(code);
    }),
  };
}

export async function ensureCountrySource(context: LayerRenderContext) {
  if (context.map.getSource(COUNTRY_SOURCE_ID)) {
    return;
  }

  const geojson = await getCountriesGeoJson();
  context.map.addSource(COUNTRY_SOURCE_ID, {
    type: 'geojson',
    data: filterCountriesGeoJson(geojson),
  });
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
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': COUNTRY_BASE_LINE_COLOR,
      'line-width': COUNTRY_BASE_LINE_WIDTH,
      'line-opacity': COUNTRY_BASE_LINE_OPACITY,
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[2],
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': COUNTRY_BASE_GLOW_COLOR,
      'line-width': COUNTRY_BASE_GLOW_WIDTH,
      'line-opacity': COUNTRY_BASE_GLOW_OPACITY,
    },
  });

  addLayerIfMissing(context, {
    id: COUNTRIES_BASE_LAYER_IDS[3],
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

export function registerThreatHighlightLayers(context: LayerRenderContext) {
  registerThreatFillLayer(context);
  registerThreatOutlineLayer(context);
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
