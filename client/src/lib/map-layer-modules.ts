import type { ThreatLevel, ThreatMapResponse } from '@shared/types';
import type { ExpressionSpecification } from 'maplibre-gl';

import { getCountriesGeoJson } from './country-geometry';
import type { LayerModule, LayerModuleContext, LayerModuleMap } from './map-layer-registry';

const HIDDEN_COUNTRY_CODES = new Set(['AQ']);

const COUNTRY_SOURCE_ID = 'countries';
const COUNTRY_BACKGROUND_LAYER_ID = 'map-background';
const COUNTRY_BASE_LAYER_ID = 'countries-base-fill';
const COUNTRY_THREAT_FILL_LAYER_ID = 'countries-threat-fill';
const COUNTRY_THREAT_LINE_LAYER_ID = 'countries-threat-line';

const THREAT_COLORS: Record<ThreatLevel, string> = {
  none: 'rgba(0,0,0,0)',
  low: 'rgba(34,197,94,0.82)',
  medium: 'rgba(245,158,11,0.82)',
  high: 'rgba(239,68,68,0.82)',
  critical: 'rgba(217,70,239,0.85)',
};

const TRANSPARENT_COLOR = 'rgba(0,0,0,0)';

type ManagedLayer = {
  id: string;
  type: 'background' | 'fill' | 'line';
  source?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown;
  beforeId?: string;
};

function filterCountriesGeoJson(geojson: Awaited<ReturnType<typeof getCountriesGeoJson>>) {
  return {
    ...geojson,
    features: geojson.features.filter((feature) => {
      const code = feature.properties?.['ISO3166-1-Alpha-2'];
      return typeof code !== 'string' || !HIDDEN_COUNTRY_CODES.has(code);
    }),
  };
}

function buildCountrySourceData() {
  return getCountriesGeoJson().then(filterCountriesGeoJson);
}

function buildCountryBaseLayer(): ManagedLayer {
  return {
    id: COUNTRY_BASE_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': '#071310',
      'fill-opacity': 0.3,
    },
  };
}

function buildMapBackgroundLayer(): ManagedLayer {
  return {
    id: COUNTRY_BACKGROUND_LAYER_ID,
    type: 'background',
    paint: {
      'background-color': '#505050',
    },
  };
}

function buildThreatFillLayer(threatData: ThreatMapResponse | null): ManagedLayer {
  return {
    id: COUNTRY_THREAT_FILL_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': buildThreatColorExpression(threatData),
      'fill-opacity': 1,
    },
  };
}

function buildThreatLineLayer(threatData: ThreatMapResponse | null): ManagedLayer {
  return {
    id: COUNTRY_THREAT_LINE_LAYER_ID,
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': buildThreatColorExpression(threatData),
      'line-width': 1,
    },
  };
}

export function getThreatColor(level: ThreatLevel): string {
  return THREAT_COLORS[level];
}

export function buildThreatColorExpression(
  threatData: ThreatMapResponse | null,
): ExpressionSpecification | string {
  const countries = threatData?.countries ?? [];
  if (countries.length === 0) {
    return TRANSPARENT_COLOR;
  }

  const expression: Array<string | number | boolean | null | Array<string | number | boolean | null>> = [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
  ];

  for (const country of countries) {
    expression.push(country.country, getThreatColor(country.threatLevel));
  }

  expression.push(TRANSPARENT_COLOR);
  return expression as unknown as ExpressionSpecification;
}

export async function ensureCountriesSource(map: LayerModuleMap): Promise<void> {
  const existingSource = map.getSource(COUNTRY_SOURCE_ID);
  if (existingSource) {
    return;
  }

  const sourceData = await buildCountrySourceData();
  map.addSource(COUNTRY_SOURCE_ID, {
    type: 'geojson',
    data: sourceData,
  });
}

export function syncThreatLayerPaints(
  map: LayerModuleMap,
  threatData: ThreatMapResponse | null,
): void {
  const colorExpression = buildThreatColorExpression(threatData);

  if (map.getLayer(COUNTRY_THREAT_FILL_LAYER_ID)) {
    map.setPaintProperty(COUNTRY_THREAT_FILL_LAYER_ID, 'fill-color', colorExpression);
    map.setPaintProperty(COUNTRY_THREAT_FILL_LAYER_ID, 'fill-opacity', 1);
  }

  if (map.getLayer(COUNTRY_THREAT_LINE_LAYER_ID)) {
    map.setPaintProperty(COUNTRY_THREAT_LINE_LAYER_ID, 'line-color', colorExpression);
    map.setPaintProperty(COUNTRY_THREAT_LINE_LAYER_ID, 'line-width', 1);
  }
}

function clampBeforeId(beforeId: string | null | undefined): string | undefined {
  return typeof beforeId === 'string' && beforeId.length > 0 ? beforeId : undefined;
}

function ensureLayer(
  map: LayerModuleMap,
  layer: ManagedLayer,
  beforeId?: string,
): void {
  if (map.getLayer(layer.id)) {
    return;
  }

  map.addLayer({
    ...layer,
    beforeId: clampBeforeId(beforeId),
  });
}

function assertCountriesSource(map: LayerModuleMap): void {
  if (!map.getSource(COUNTRY_SOURCE_ID)) {
    throw new Error(`Map source "${COUNTRY_SOURCE_ID}" is missing`);
  }
}

export function createBaseLayerModule(): LayerModule {
  return {
    id: 'base',
    label: 'Base map layers',
    async install(context: LayerModuleContext) {
      await ensureCountriesSource(context.map);
      ensureLayer(context.map, buildMapBackgroundLayer());
      ensureLayer(context.map, buildCountryBaseLayer());
    },
    async refresh(context: LayerModuleContext) {
      await ensureCountriesSource(context.map);
      ensureLayer(context.map, buildMapBackgroundLayer());
      ensureLayer(context.map, buildCountryBaseLayer());
    },
    async dispose(context: LayerModuleContext) {
      if (context.map.getLayer(COUNTRY_BASE_LAYER_ID)) {
        context.map.removeLayer(COUNTRY_BASE_LAYER_ID);
      }

      if (context.map.getLayer(COUNTRY_BACKGROUND_LAYER_ID)) {
        context.map.removeLayer(COUNTRY_BACKGROUND_LAYER_ID);
      }
    },
  };
}

export function createThreatLayerModule(): LayerModule {
  return {
    id: 'threat',
    label: 'Threat map layers',
    async install(context: LayerModuleContext) {
      assertCountriesSource(context.map);
      ensureLayer(context.map, buildThreatFillLayer(context.threatData));
      ensureLayer(context.map, buildThreatLineLayer(context.threatData));
      syncThreatLayerPaints(context.map, context.threatData);
    },
    async refresh(context: LayerModuleContext) {
      assertCountriesSource(context.map);
      ensureLayer(context.map, buildThreatFillLayer(context.threatData));
      ensureLayer(context.map, buildThreatLineLayer(context.threatData));
      syncThreatLayerPaints(context.map, context.threatData);
    },
    async dispose(context: LayerModuleContext) {
      if (context.map.getLayer(COUNTRY_THREAT_LINE_LAYER_ID)) {
        context.map.removeLayer(COUNTRY_THREAT_LINE_LAYER_ID);
      }

      if (context.map.getLayer(COUNTRY_THREAT_FILL_LAYER_ID)) {
        context.map.removeLayer(COUNTRY_THREAT_FILL_LAYER_ID);
      }
    },
  };
}
