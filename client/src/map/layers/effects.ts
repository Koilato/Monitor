import type { ThreatMapResponse } from '@shared/types';
import type { ExpressionSpecification } from 'maplibre-gl';

import type { LayerRenderContext } from 'map/layers/registry';
import {
  buildCountryCodeFilter,
  HOVER_HIGHLIGHT_LAYER_IDS,
  THREAT_FILL_LAYER_ID,
  THREAT_GLOW_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  COUNTRY_BASE_FILL_COLOR,
  COUNTRY_BASE_GLOW_COLOR,
  COUNTRY_BASE_LINE_COLOR,
  createActiveCountryCodeSet,
  getThreatVisualToken,
  HOVER_BORDER_DEFAULT_COLOR,
  HOVER_FILL_DEFAULT_COLOR,
  HOVER_FILL_DEFAULT_OPACITY,
  HOVER_FILL_THREAT_OPACITY,
  HOVER_GLOW_DEFAULT_COLOR,
  HOVER_GLOW_DEFAULT_OPACITY,
  HOVER_GLOW_THREAT_OPACITY,
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
  activeCountryCodes: readonly string[] = [],
  threatColorsEnabled = true,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    activeCountryCodes,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).fill,
    COUNTRY_BASE_FILL_COLOR,
  );
}

function buildThreatExpression(
  threatData: ThreatMapResponse | null,
  activeCountryCodes: readonly string[],
  threatColorsEnabled: boolean,
  getColor: (level: ThreatVisualLevel) => string,
  fallbackColor: string,
): ExpressionSpecification | string {
  const countries = threatData?.countries ?? [];
  if (countries.length === 0) {
    return 'rgba(0,0,0,0)';
  }
  const activeCountryCodeSet = createActiveCountryCodeSet(activeCountryCodes);

  const expression: Array<string | number | boolean | null | Array<string | number | boolean | null>> = [
    'match',
    ['get', 'ISO3166-1-Alpha-2'],
  ];

  for (const country of countries) {
    const visualLevel = resolveThreatVisualLevel(
      country.eventLevel,
      country.country,
      activeCountryCodes,
      activeCountryCodeSet,
    );
    expression.push(country.country, threatColorsEnabled ? getColor(visualLevel) : fallbackColor);
  }

  expression.push('rgba(0,0,0,0)');
  return expression as unknown as ExpressionSpecification;
}

export function buildThreatOutlineColorExpression(
  threatData: ThreatMapResponse | null,
  activeCountryCodes: readonly string[] = [],
  threatColorsEnabled = true,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    activeCountryCodes,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).stroke,
    COUNTRY_BASE_LINE_COLOR,
  );
}

export function buildThreatGlowColorExpression(
  threatData: ThreatMapResponse | null,
  activeCountryCodes: readonly string[] = [],
  threatColorsEnabled = true,
): ExpressionSpecification | string {
  return buildThreatExpression(
    threatData,
    activeCountryCodes,
    threatColorsEnabled,
    (level) => getThreatVisualToken(level).glow,
    COUNTRY_BASE_GLOW_COLOR,
  );
}

export function applyThreatFillState(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_FILL_LAYER_ID)) {
    context.map.setPaintProperty(
      THREAT_FILL_LAYER_ID,
      'fill-color',
      buildThreatColorExpression(
        context.threatData,
        context.activeThreatCountryCodes,
        context.debugSettings.threatColorsEnabled,
      ),
    );
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
        context.activeThreatCountryCodes,
        context.debugSettings.threatColorsEnabled,
      ),
    );
    context.map.setPaintProperty(
      THREAT_OUTLINE_LAYER_ID,
      'line-width',
      context.debugSettings.threatOutlineWidth,
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
        context.activeThreatCountryCodes,
        context.debugSettings.threatColorsEnabled,
      ),
    );
  }
}

export function applyHoverHighlightState(context: LayerRenderContext) {
  const filter = buildCountryCodeFilter(context.hoveredCountryCode);
  const hoveredThreat = getThreatLevelForCountry(context.threatData, context.hoveredCountryCode);
  const activeCountryCodeSet = createActiveCountryCodeSet(context.activeThreatCountryCodes);
  const visualLevel = hoveredThreat
    ? resolveThreatVisualLevel(
      hoveredThreat.eventLevel,
      hoveredThreat.country,
      context.activeThreatCountryCodes,
      activeCountryCodeSet,
    )
    : null;
  const hoverFillColor = visualLevel
    ? getThreatVisualToken(visualLevel).fill
    : HOVER_FILL_DEFAULT_COLOR;
  const hoverGlowColor = visualLevel
    ? getThreatVisualToken(visualLevel).glow
    : HOVER_GLOW_DEFAULT_COLOR;
  const hoverBorderColor = visualLevel
    ? getThreatVisualToken(visualLevel).stroke
    : HOVER_BORDER_DEFAULT_COLOR;

  if (context.map.getLayer(HOVER_HIGHLIGHT_LAYER_IDS[0])) {
    context.map.setFilter(HOVER_HIGHLIGHT_LAYER_IDS[0], filter as never);
    context.map.setPaintProperty(HOVER_HIGHLIGHT_LAYER_IDS[0], 'fill-color', hoverFillColor);
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
