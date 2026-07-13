import type { ThreatMapResponse } from '@shared/types';
import type { ExpressionSpecification } from 'maplibre-gl';

import type { LayerRenderContext } from 'map/layers/registry';
import {
  COUNTRIES_BASE_LAYER_IDS,
  buildCountryCodeFilter,
  HOVER_HIGHLIGHT_LAYER_IDS,
  THREAT_FILL_LAYER_ID,
  THREAT_GLOW_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  COUNTRY_BASE_FILL_COLOR,
  THREAT_GLOW_NEUTRAL_COLOR,
  THREAT_OUTLINE_NEUTRAL_COLOR,
  getThreatVisualToken,
  resolveThreatVisualLevel,
  type ThreatVisualLevel,
} from 'map/layers/tokens';

export function getThreatLevelForCountry(
  threatData: ThreatMapResponse | null,
  countryCode: string | null | undefined,
) {
  if (!countryCode || !threatData) {
    return null;
  }

  return threatData.countries.find((country) => country.country === countryCode) ?? null;
}

export function buildThreatColorExpression(
  threatData: ThreatMapResponse | null,
  threatColorsEnabled = true,
  fallbackColor = COUNTRY_BASE_FILL_COLOR,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).fill,
    fallbackColor,
  );
}

function buildThreatExpression(
  threatData: ThreatMapResponse | null,
  threatColorsEnabled: boolean,
  getColor: (level: Exclude<ThreatVisualLevel, 'none'>) => string,
  fallbackColor: string,
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
    const visualLevel = resolveThreatVisualLevel(country.eventLevel);
    expression.push(country.country, threatColorsEnabled ? getColor(visualLevel) : fallbackColor);
  }

  expression.push('rgba(0,0,0,0)');
  return expression as unknown as ExpressionSpecification;
}

export function buildThreatOutlineColorExpression(
  threatData: ThreatMapResponse | null,
  threatColorsEnabled = true,
  fallbackColor = THREAT_OUTLINE_NEUTRAL_COLOR,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).stroke,
    fallbackColor,
  );
}

export function buildThreatGlowColorExpression(
  threatData: ThreatMapResponse | null,
  threatColorsEnabled = true,
  fallbackColor = THREAT_GLOW_NEUTRAL_COLOR,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).glow,
    fallbackColor,
  );
}

export function applyThreatFillState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_FILL_LAYER_ID)) {
    context.map.setPaintProperty(
      THREAT_FILL_LAYER_ID,
      'fill-color',
      buildThreatColorExpression(
        context.threatData,
        context.debugSettings.threatColorsEnabled,
        context.debugSettings.baseCountryFillColor,
      ),
    );
    context.map.setPaintProperty(
      THREAT_FILL_LAYER_ID,
      'fill-opacity',
      context.debugSettings.threatFillOpacity,
    );
  }
}

export function applyCountriesBaseState(context: LayerRenderContext) {
  const baseFillLayerId = COUNTRIES_BASE_LAYER_IDS[0];
  const baseOutlineLayerId = COUNTRIES_BASE_LAYER_IDS[1];
  const baseGlowLayerId = COUNTRIES_BASE_LAYER_IDS[2];
  if (context.map.getLayer(baseFillLayerId)) {
    context.map.setPaintProperty(baseFillLayerId, 'fill-color', context.debugSettings.baseCountryFillColor);
    context.map.setPaintProperty(baseFillLayerId, 'fill-opacity', context.debugSettings.baseCountryFillOpacity);
  }
  if (context.map.getLayer(baseOutlineLayerId)) {
    context.map.setPaintProperty(baseOutlineLayerId, 'line-color', context.debugSettings.baseCountryOutlineColor);
    context.map.setPaintProperty(baseOutlineLayerId, 'line-width', context.debugSettings.baseCountryOutlineWidth);
    context.map.setPaintProperty(baseOutlineLayerId, 'line-opacity', context.debugSettings.baseCountryOutlineOpacity);
  }
  if (context.map.getLayer(baseGlowLayerId)) {
    context.map.setPaintProperty(baseGlowLayerId, 'line-color', context.debugSettings.baseCountryGlowColor);
    context.map.setPaintProperty(baseGlowLayerId, 'line-width', context.debugSettings.baseCountryGlowWidth);
    context.map.setPaintProperty(baseGlowLayerId, 'line-opacity', context.debugSettings.baseCountryGlowOpacity);
  }
}

export function applyThreatOutlineState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_OUTLINE_LAYER_ID)) {
    context.map.setLayoutProperty(
      THREAT_OUTLINE_LAYER_ID,
      'visibility',
      context.debugSettings.threatOutlineVisible ? 'visible' : 'none',
    );
    context.map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-color',
      buildThreatOutlineColorExpression(
        context.threatData,
        context.debugSettings.threatColorsEnabled,
        context.debugSettings.threatOutlineNeutralColor,
      ),
    );
    context.map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-width',
      context.debugSettings.threatOutlineWidth,
    );
    context.map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-opacity',
      context.debugSettings.threatOutlineOpacity,
    );
  }
}

export function applyThreatGlowState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_GLOW_LAYER_ID)) {
    context.map.setPaintProperty(
      THREAT_GLOW_LAYER_ID,
      'line-color',
      buildThreatGlowColorExpression(
        context.threatData,
        context.debugSettings.threatColorsEnabled,
        context.debugSettings.threatGlowNeutralColor,
      ),
    );
    context.map.setPaintProperty(
      THREAT_GLOW_LAYER_ID,
      'line-width',
      context.debugSettings.threatGlowWidth,
    );
    context.map.setPaintProperty(
      THREAT_GLOW_LAYER_ID,
      'line-opacity',
      context.debugSettings.threatGlowOpacity,
    );
  }
}

export function applyHoverHighlightState(context: LayerRenderContext) {
  const filter = buildCountryCodeFilter(context.hoveredCountryCode);
  const hoveredThreat = getThreatLevelForCountry(context.threatData, context.hoveredCountryCode);
  const visualLevel = hoveredThreat ? resolveThreatVisualLevel(hoveredThreat.eventLevel) : null;
  const hoverFillColor = visualLevel
    ? getThreatVisualToken(visualLevel).fill
    : context.debugSettings.hoverFillColor;
  const hoverGlowColor = visualLevel
    ? getThreatVisualToken(visualLevel).glow
    : context.debugSettings.hoverGlowColor;
  const hoverBorderColor = visualLevel
    ? getThreatVisualToken(visualLevel).stroke
    : context.debugSettings.hoverBorderColor;

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[0])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[0], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[0], 'fill-color', hoverFillColor);
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[0],
      'fill-opacity',
      hoveredThreat ? context.debugSettings.hoverThreatFillOpacity : context.debugSettings.hoverFillOpacity,
    );
  }

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[1])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[1], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[1], 'line-color', hoverGlowColor);
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[1],
      'line-width',
      context.debugSettings.hoverGlowWidth,
    );
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[1],
      'line-opacity',
      hoveredThreat ? context.debugSettings.hoverThreatGlowOpacity : context.debugSettings.hoverGlowOpacity,
    );
  }

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[2])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[2], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[2], 'line-color', hoverBorderColor);
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[2],
      'line-width',
      context.debugSettings.hoverBorderWidth,
    );
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[2],
      'line-opacity',
      hoveredThreat ? context.debugSettings.hoverThreatBorderOpacity : context.debugSettings.hoverBorderOpacity,
    );
  }
}
