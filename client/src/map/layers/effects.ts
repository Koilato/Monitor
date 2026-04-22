import type { ThreatLevel, ThreatMapResponse } from '@shared/types';
import type { ExpressionSpecification } from 'maplibre-gl';

import type { LayerRenderContext } from 'map/layers/registry';
import {
  buildCountryCodeFilter,
  HOVER_HIGHLIGHT_LAYER_IDS,
  THREAT_FILL_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  HOVER_BORDER_DEFAULT_COLOR,
  HOVER_BORDER_THREAT_COLOR,
  HOVER_FILL_DEFAULT_COLOR,
  HOVER_FILL_DEFAULT_OPACITY,
  HOVER_FILL_THREAT_OPACITY,
  HOVER_GLOW_DEFAULT_COLOR,
  HOVER_GLOW_DEFAULT_OPACITY,
  HOVER_GLOW_THREAT_OPACITY,
  THREAT_LEVEL_COLORS,
  THREAT_LEVEL_OUTLINE_COLORS,
} from 'map/layers/tokens';

function getThreatColor(level: ThreatLevel): string {
  return THREAT_LEVEL_COLORS[level];
}

function getThreatOutlineColor(level: ThreatLevel): string {
  return THREAT_LEVEL_OUTLINE_COLORS[level];
}

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
): ExpressionSpecification | string {
  return buildThreatExpression(threatData, getThreatColor);
}

function buildThreatExpression(
  threatData: ThreatMapResponse | null,
  getColor: (level: ThreatLevel) => string,
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
    expression.push(country.country, getColor(country.threatLevel));
  }

  expression.push('rgba(0,0,0,0)');
  return expression as unknown as ExpressionSpecification;
}

export function buildThreatOutlineColorExpression(
  threatData: ThreatMapResponse | null,
): ExpressionSpecification | string {
  return buildThreatExpression(threatData, getThreatOutlineColor);
}

export function applyThreatFillState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_FILL_LAYER_ID)) {
    context.map.setPaintProperty(
      THREAT_FILL_LAYER_ID,
      'fill-color',
      buildThreatColorExpression(context.threatData),
    );
  }
}

export function applyThreatOutlineState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_OUTLINE_LAYER_ID)) {
    context.map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-color',
      buildThreatOutlineColorExpression(context.threatData),
    );
  }
}

export function applyHoverHighlightState(context: LayerRenderContext) {
  const filter = buildCountryCodeFilter(context.hoveredCountryCode);
  const hoveredThreat = getThreatLevelForCountry(context.threatData, context.hoveredCountryCode);
  const hoverColor = hoveredThreat
    ? getThreatColor(hoveredThreat.threatLevel)
    : HOVER_FILL_DEFAULT_COLOR;
  const hoverGlowColor = hoveredThreat
    ? getThreatColor(hoveredThreat.threatLevel)
    : HOVER_GLOW_DEFAULT_COLOR;
  const hoverBorderColor = hoveredThreat
    ? HOVER_BORDER_THREAT_COLOR
    : HOVER_BORDER_DEFAULT_COLOR;

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[0])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[0], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[0], 'fill-color', hoverColor);
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[0],
      'fill-opacity',
      hoveredThreat ? HOVER_FILL_THREAT_OPACITY : HOVER_FILL_DEFAULT_OPACITY,
    );
  }

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[1])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[1], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[1], 'line-color', hoverGlowColor);
    context.map.setPaintProperty(
      HOVER_HIGHLIGHT_LAYER_IDS[1],
      'line-opacity',
      hoveredThreat ? HOVER_GLOW_THREAT_OPACITY : HOVER_GLOW_DEFAULT_OPACITY,
    );
  }

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[2])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[2], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[2], 'line-color', hoverBorderColor);
  }
}
