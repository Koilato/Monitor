import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';
import type { ThreatLevel, ThreatMapResponse } from '@shared/types';
import type { ExpressionSpecification } from 'maplibre-gl';

import { buildTwoDArcData, type TwoDArcDatum } from 'map/hooks/useMapDataSync';
import { getCountriesGeoJson } from 'map/lib/country-geometry';
import type { LayerModule, LayerRenderContext } from 'map/layers/registry';

const COUNTRY_SOURCE_ID = 'countries';
const HIDDEN_COUNTRY_CODES = new Set(['AQ']);
const EMPTY_FILTER: ['==', ['get', 'ISO3166-1-Alpha-2'], ''] = ['==', ['get', 'ISO3166-1-Alpha-2'], ''];

const ARROW_ICON_ATLAS = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <path d="M8 32h30.5" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <path d="M32 22l16 10-16 10" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`)}`;

export const THREAT_LEVEL_COLORS: Record<ThreatLevel, string> = {
  none: 'rgba(0,0,0,0)',
  low: 'rgba(34,197,94,0.82)',
  medium: 'rgba(245,158,11,0.82)',
  high: 'rgba(239,68,68,0.82)',
  critical: 'rgba(217,70,239,0.85)',
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

async function ensureCountrySource(context: LayerRenderContext) {
  if (context.map.getSource(COUNTRY_SOURCE_ID)) {
    return;
  }

  const geojson = await getCountriesGeoJson();
  context.map.addSource(COUNTRY_SOURCE_ID, {
    type: 'geojson',
    data: filterCountriesGeoJson(geojson),
  });
}

function addLayerIfMissing(
  context: LayerRenderContext,
  layer: Parameters<LayerRenderContext['map']['addLayer']>[0],
) {
  if (!context.map.getLayer(layer.id)) {
    context.map.addLayer(layer);
  }
}

function getThreatColor(level: ThreatLevel): string {
  return THREAT_LEVEL_COLORS[level];
}

function getThreatLevelForCountry(
  threatData: ThreatMapResponse | null,
  countryCode: string | null | undefined,
) {
  if (!countryCode || !threatData) {
    return null;
  }

  return threatData.countries.find((country) => country.country === countryCode) ?? null;
}

function buildThreatColorExpression(
  threatData: ThreatMapResponse | null,
): ExpressionSpecification | string {
  const countries = threatData?.countries ?? [];
  if (countries.length === 0) {
    return 'rgba(0,0,0,0)';
  }

  const expression: Array<string | number | boolean | null | Array<string | number | boolean | null>> = [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
  ];

  for (const country of countries) {
    expression.push(country.country, getThreatColor(country.threatLevel));
  }

  expression.push('rgba(0,0,0,0)');
  return expression as unknown as ExpressionSpecification;
}

function getIconLayerProps(): IconLayerProps<TwoDArcDatum> {
  return {
    id: 'attack-arrowheads-base',
    data: [] as TwoDArcDatum[],
    iconAtlas: ARROW_ICON_ATLAS,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 64, height: 64, mask: true },
    },
    getIcon: () => 'arrow',
    getPosition: (datum) => datum.arrowPosition,
    getAngle: (datum) => datum.angle,
    getColor: [255, 72, 120, 220],
    getSize: (datum) => Math.min(18, 11 + datum.count * 0.55),
    sizeUnits: 'pixels',
    pickable: false,
  };
}

const countriesBaseModule: LayerModule = {
  id: 'countries-base',
  label: 'Countries',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: [
    'countries-base-fill',
    'countries-base-line',
    'countries-base-glow',
    'countries-interactive',
  ],
  registerMapSources: ensureCountrySource,
  registerStyleLayers(context) {
    addLayerIfMissing(context, {
      id: 'countries-base-fill',
      type: 'fill',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'fill-color': '#071310',
        'fill-opacity': 0.18,
      },
    });

    addLayerIfMissing(context, {
      id: 'countries-base-line',
      type: 'line',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'line-color': '#1f6f5d',
        'line-width': 1.05,
        'line-opacity': 0.9,
      },
    });

    addLayerIfMissing(context, {
      id: 'countries-base-glow',
      type: 'line',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'line-color': '#0dd6a0',
        'line-width': 2.6,
        'line-opacity': 0.16,
      },
    });

    addLayerIfMissing(context, {
      id: 'countries-interactive',
      type: 'fill',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'fill-color': '#0f172a',
        'fill-opacity': 0,
      },
    });
  },
};

const threatFillModule: LayerModule = {
  id: 'threat-fill',
  label: 'Threat Fill',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: ['countries-threat-fill'],
  registerStyleLayers(context) {
    addLayerIfMissing(context, {
      id: 'countries-threat-fill',
      type: 'fill',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'fill-color': 'rgba(0,0,0,0)',
        'fill-opacity': 0.82,
      },
    });
  },
  applyState(context) {
    if (context.map.getLayer('countries-threat-fill')) {
      context.map.setPaintProperty(
        'countries-threat-fill',
        'fill-color',
        buildThreatColorExpression(context.threatData),
      );
    }
  },
};

const threatOutlineModule: LayerModule = {
  id: 'threat-outline',
  label: 'Threat Outline',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: ['countries-threat-line'],
  registerStyleLayers(context) {
    addLayerIfMissing(context, {
      id: 'countries-threat-line',
      type: 'line',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'line-color': 'rgba(0,0,0,0)',
        'line-width': 1.8,
        'line-opacity': 0.9,
      },
    });
  },
  applyState(context) {
    if (context.map.getLayer('countries-threat-line')) {
      context.map.setPaintProperty(
        'countries-threat-line',
        'line-color',
        buildThreatColorExpression(context.threatData),
      );
    }
  },
  legend: {
    label: 'Threat',
    items: [
      { label: 'LOW', color: THREAT_LEVEL_COLORS.low },
      { label: 'MED', color: THREAT_LEVEL_COLORS.medium },
      { label: 'HIGH', color: THREAT_LEVEL_COLORS.high },
      { label: 'CRIT', color: THREAT_LEVEL_COLORS.critical },
    ],
  },
};

const hoverHighlightModule: LayerModule = {
  id: 'hover-highlight',
  label: 'Hover Highlight',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: [
    'countries-hover-fill',
    'countries-hover-glow',
    'countries-hover-border',
  ],
  registerStyleLayers(context) {
    addLayerIfMissing(context, {
      id: 'countries-hover-fill',
      type: 'fill',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'fill-color': '#00ffaa',
        'fill-opacity': 0.3,
      },
      filter: EMPTY_FILTER,
    });

    addLayerIfMissing(context, {
      id: 'countries-hover-glow',
      type: 'line',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'line-color': '#7dffbf',
        'line-width': 5.5,
        'line-opacity': 0.32,
      },
      filter: EMPTY_FILTER,
    });

    addLayerIfMissing(context, {
      id: 'countries-hover-border',
      type: 'line',
      source: COUNTRY_SOURCE_ID,
      paint: {
        'line-color': '#44ff88',
        'line-width': 2.2,
        'line-opacity': 1,
      },
      filter: EMPTY_FILTER,
    });
  },
  applyState(context) {
    const code = context.hoveredCountryCode ?? '';
    const filter = code
      ? ['==', ['get', 'ISO3166-1-Alpha-2'], code]
      : EMPTY_FILTER;
    const hoveredThreat = getThreatLevelForCountry(context.threatData, context.hoveredCountryCode);
    const hoverColor = hoveredThreat
      ? getThreatColor(hoveredThreat.threatLevel)
      : 'rgba(96, 255, 182, 0.9)';
    const hoverGlowColor = hoveredThreat
      ? getThreatColor(hoveredThreat.threatLevel)
      : 'rgba(125, 255, 191, 0.95)';
    const hoverBorderColor = hoveredThreat
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(68, 255, 136, 1)';

    if (context.map.getLayer('countries-hover-fill')) {
      context.map.setFilter('countries-hover-fill', filter as never);
      context.map.setPaintProperty('countries-hover-fill', 'fill-color', hoverColor);
      context.map.setPaintProperty('countries-hover-fill', 'fill-opacity', hoveredThreat ? 0.22 : 0.28);
    }

    if (context.map.getLayer('countries-hover-glow')) {
      context.map.setFilter('countries-hover-glow', filter as never);
      context.map.setPaintProperty('countries-hover-glow', 'line-color', hoverGlowColor);
      context.map.setPaintProperty('countries-hover-glow', 'line-opacity', hoveredThreat ? 0.42 : 0.32);
    }

    if (context.map.getLayer('countries-hover-border')) {
      context.map.setFilter('countries-hover-border', filter as never);
      context.map.setPaintProperty('countries-hover-border', 'line-color', hoverBorderColor);
    }
  },
};

const attackArcsModule: LayerModule = {
  id: 'attack-arcs',
  label: 'Attack Arcs',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  async buildOverlayLayers(context) {
    const data = await buildTwoDArcData(context.data);
    return [
      new ArcLayer<TwoDArcDatum>({
        id: 'attack-arcs-glow',
        data,
        getSourcePosition: (datum) => datum.source,
        getTargetPosition: (datum) => datum.target,
        getSourceColor: [56, 189, 248, 60],
        getTargetColor: [255, 72, 120, 95],
        getWidth: (datum) => Math.max(3.2, datum.count * 1.8),
        widthUnits: 'pixels',
        pickable: false,
      }),
      new ArcLayer<TwoDArcDatum>({
        id: 'attack-arcs',
        data,
        getSourcePosition: (datum) => datum.source,
        getTargetPosition: (datum) => datum.target,
        getSourceColor: [56, 189, 248, 225],
        getTargetColor: [255, 72, 120, 245],
        getWidth: (datum) => Math.max(1.6, datum.count * 1.05),
        widthUnits: 'pixels',
        pickable: false,
      }),
    ];
  },
};

const attackArrowheadsModule: LayerModule = {
  id: 'attack-arrowheads',
  label: 'Attack Arrowheads',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  async buildOverlayLayers(context) {
    const data = await buildTwoDArcData(context.data);
    return [
      new IconLayer<TwoDArcDatum>({
        ...getIconLayerProps(),
        id: 'attack-arrowheads',
        data,
      }),
    ];
  },
};

export const LAYER_MODULES: LayerModule[] = [
  countriesBaseModule,
  threatFillModule,
  threatOutlineModule,
  hoverHighlightModule,
  attackArcsModule,
  attackArrowheadsModule,
];
