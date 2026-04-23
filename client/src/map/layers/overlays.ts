import type { Layer } from '@deck.gl/core';
import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';
import type { EventLevel } from '@shared/types';

import { buildTwoDArcData, type TwoDArcDatum } from 'map/lib/arc-data';
import type { LayerRenderContext } from 'map/layers/registry';
import {
  ARROW_ICON_ATLAS,
  getThreatVisualToken,
  rgbaStringToDeckColor,
  resolveThreatVisualLevel,
  scaleDeckColorAlpha,
  type DeckColor,
} from 'map/layers/tokens';
import { THREAT_LABEL_LAYER_ID } from 'map/layers/threat-labels';

interface ThreatArcPalette {
  source: DeckColor;
  target: DeckColor;
  glowSource: DeckColor;
  glowTarget: DeckColor;
  arrow: DeckColor;
}

function getIconLayerProps(getArrowColor: (datum: TwoDArcDatum) => DeckColor): IconLayerProps<TwoDArcDatum> {
  const props: IconLayerProps<TwoDArcDatum> & { beforeId: string } = {
    id: 'attack-arrowheads-base',
    data: [] as TwoDArcDatum[],
    iconAtlas: ARROW_ICON_ATLAS,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 64, height: 64, mask: true },
    },
    getIcon: () => 'arrow',
    getPosition: (datum) => datum.arrowPosition,
    getAngle: (datum) => datum.angle,
    getColor: getArrowColor,
    getSize: (datum) => Math.min(18, 11 + datum.count * 0.55),
    sizeUnits: 'pixels',
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };

  return props;
}

function resolveThreatLevelForVictimCountry(
  context: LayerRenderContext,
): { level: EventLevel; countryCode: string | null } {
  const countryCode = context.data?.victimCountry ?? null;
  if (!countryCode) {
    return { level: 'low', countryCode: null };
  }

  const countryStat = context.threatData?.countries.find((country) => country.country === countryCode);
  if (!countryStat) {
    return { level: 'low', countryCode };
  }

  return { level: countryStat.eventLevel, countryCode };
}

export function buildThreatArcPalette(
  level: EventLevel,
  activeThreatCountryCodes: readonly string[],
  countryCode: string | null = null,
): ThreatArcPalette {
  const visualLevel = resolveThreatVisualLevel(level, countryCode, activeThreatCountryCodes);
  const base = rgbaStringToDeckColor(getThreatVisualToken(visualLevel).arc);

  return {
    source: scaleDeckColorAlpha(base, 0.68),
    target: base,
    glowSource: scaleDeckColorAlpha(base, 0.42),
    glowTarget: scaleDeckColorAlpha(base, 0.75),
    arrow: scaleDeckColorAlpha(base, 0.9),
  };
}

export async function buildAttackArcLayers(context: LayerRenderContext): Promise<Layer[]> {
  const data = await buildTwoDArcData(context.data);
  const { level, countryCode } = resolveThreatLevelForVictimCountry(context);
  const palette = buildThreatArcPalette(level, context.activeThreatCountryCodes, countryCode);
  const glowLayerProps = {
    id: 'attack-arcs-glow',
    data,
    getSourcePosition: (datum: TwoDArcDatum) => datum.source,
    getTargetPosition: (datum: TwoDArcDatum) => datum.target,
    getSourceColor: () => palette.glowSource,
    getTargetColor: () => palette.glowTarget,
    getWidth: (datum: TwoDArcDatum) => Math.max(3.2, datum.count * 1.8),
    widthUnits: 'pixels' as const,
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };
  const arcLayerProps = {
    id: 'attack-arcs',
    data,
    getSourcePosition: (datum: TwoDArcDatum) => datum.source,
    getTargetPosition: (datum: TwoDArcDatum) => datum.target,
    getSourceColor: () => palette.source,
    getTargetColor: () => palette.target,
    getWidth: (datum: TwoDArcDatum) => Math.max(1.6, datum.count * 1.05),
    widthUnits: 'pixels' as const,
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };

  return [
    new ArcLayer<TwoDArcDatum>(glowLayerProps),
    new ArcLayer<TwoDArcDatum>(arcLayerProps),
  ];
}

export async function buildAttackArrowheadLayers(context: LayerRenderContext): Promise<Layer[]> {
  const data = await buildTwoDArcData(context.data);
  const { level, countryCode } = resolveThreatLevelForVictimCountry(context);
  const palette = buildThreatArcPalette(level, context.activeThreatCountryCodes, countryCode);
  return [
    new IconLayer<TwoDArcDatum>({
      ...getIconLayerProps(() => palette.arrow),
      id: 'attack-arrowheads',
      data,
    }),
  ];
}
