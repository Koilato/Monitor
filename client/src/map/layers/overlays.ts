import type { Layer } from '@deck.gl/core';
import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';

import {
  buildTwoDArcData,
  resolveBundledArcEndpoints,
  type BundledTwoDArcDatum,
} from 'map/lib/arc-data';
import type { LayerRenderContext } from 'map/layers/registry';
import {
  ARROW_ICON_ATLAS,
  getThreatVisualToken,
  rgbaStringToDeckColor,
  scaleDeckColorAlpha,
  type DeckColor,
  type ThreatVisualLevel,
} from 'map/layers/tokens';
import { THREAT_LABEL_LAYER_ID } from 'map/layers/threat-labels';

interface ThreatArcPalette {
  source: DeckColor;
  target: DeckColor;
  glowSource: DeckColor;
  glowTarget: DeckColor;
  arrow: DeckColor;
}

const FALLBACK_ATTACK_ARC_SETTINGS = {
  bundleCount: 4,
  bundleSpreadRatio: 0.08,
  arcWidthScale3d: 1,
  arrowSizeScale3d: 1,
};

function resolveAttackArcSettings(context: LayerRenderContext) {
  return context.debugSettings?.attackArc ?? FALLBACK_ATTACK_ARC_SETTINGS;
}

function getIconLayerProps(
  getArrowColor: (datum: BundledTwoDArcDatum) => DeckColor,
  arrowSizeScale: number,
): IconLayerProps<BundledTwoDArcDatum> {
  const props: IconLayerProps<BundledTwoDArcDatum> & { beforeId: string } = {
    id: 'attack-arrowheads-base',
    data: [] as BundledTwoDArcDatum[],
    iconAtlas: ARROW_ICON_ATLAS,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 64, height: 64, mask: true },
    },
    getIcon: () => 'arrow',
    getPosition: (datum) => datum.arrowPosition,
    getAngle: (datum) => datum.angle,
    getColor: getArrowColor,
    getSize: (datum) => Math.min(18 * arrowSizeScale, (11 + datum.count * 0.55) * arrowSizeScale),
    sizeUnits: 'pixels',
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };

  return props;
}

export function buildThreatArcPalette(
  visualLevel: ThreatVisualLevel,
): ThreatArcPalette {
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
  if (context.view !== '3d') {
    return [];
  }

  const attackArcSettings = resolveAttackArcSettings(context);
  const data = await buildTwoDArcData(
    context.flowData ?? context.hoverData,
    context.threatData,
    context.activeThreatCountryCodes,
    {
      bundleCount: attackArcSettings.bundleCount,
      bundleSpreadRatio: attackArcSettings.bundleSpreadRatio,
    },
  );
  const glowLayerProps = {
    id: 'attack-arcs-glow',
    data,
    getSourcePosition: (datum: BundledTwoDArcDatum) => resolveBundledArcEndpoints(
      datum.source,
      datum.target,
      datum.bundleOffset,
      attackArcSettings.bundleSpreadRatio,
    ).source,
    getTargetPosition: (datum: BundledTwoDArcDatum) => resolveBundledArcEndpoints(
      datum.source,
      datum.target,
      datum.bundleOffset,
      attackArcSettings.bundleSpreadRatio,
    ).target,
    getSourceColor: (datum: BundledTwoDArcDatum) => buildThreatArcPalette(datum.visualLevel).glowSource,
    getTargetColor: (datum: BundledTwoDArcDatum) => buildThreatArcPalette(datum.visualLevel).glowTarget,
    getWidth: (datum: BundledTwoDArcDatum) => Math.max(3.2, datum.count * 1.8 * attackArcSettings.arcWidthScale3d),
    widthUnits: 'pixels' as const,
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };
  const arcLayerProps = {
    id: 'attack-arcs',
    data,
    getSourcePosition: (datum: BundledTwoDArcDatum) => resolveBundledArcEndpoints(
      datum.source,
      datum.target,
      datum.bundleOffset,
      attackArcSettings.bundleSpreadRatio,
    ).source,
    getTargetPosition: (datum: BundledTwoDArcDatum) => resolveBundledArcEndpoints(
      datum.source,
      datum.target,
      datum.bundleOffset,
      attackArcSettings.bundleSpreadRatio,
    ).target,
    getSourceColor: (datum: BundledTwoDArcDatum) => buildThreatArcPalette(datum.visualLevel).source,
    getTargetColor: (datum: BundledTwoDArcDatum) => buildThreatArcPalette(datum.visualLevel).target,
    getWidth: (datum: BundledTwoDArcDatum) => Math.max(1.6, datum.count * 1.05 * attackArcSettings.arcWidthScale3d),
    widthUnits: 'pixels' as const,
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };

  return [
    new ArcLayer<BundledTwoDArcDatum>(glowLayerProps),
    new ArcLayer<BundledTwoDArcDatum>(arcLayerProps),
  ];
}

export async function buildAttackArrowheadLayers(context: LayerRenderContext): Promise<Layer[]> {
  if (context.view !== '3d') {
    return [];
  }

  const attackArcSettings = resolveAttackArcSettings(context);
  const data = await buildTwoDArcData(
    context.flowData ?? context.hoverData,
    context.threatData,
    context.activeThreatCountryCodes,
    {
      bundleCount: attackArcSettings.bundleCount,
      bundleSpreadRatio: attackArcSettings.bundleSpreadRatio,
    },
  );
  return [
    new IconLayer<BundledTwoDArcDatum>({
      ...getIconLayerProps(
        (datum) => buildThreatArcPalette(datum.visualLevel).arrow,
        attackArcSettings.arrowSizeScale3d,
      ),
      id: 'attack-arrowheads',
      data,
    }),
  ];
}
