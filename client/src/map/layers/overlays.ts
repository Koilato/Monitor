import type { Layer } from '@deck.gl/core';
import { ArcLayer, IconLayer } from '@deck.gl/layers';
import type { IconLayerProps } from '@deck.gl/layers';

import { buildTwoDArcData, type TwoDArcDatum } from 'map/lib/arc-data';
import type { LayerRenderContext } from 'map/layers/registry';
import {
  ARROW_ICON_ATLAS,
  ATTACK_ARC_GLOW_SOURCE_COLOR,
  ATTACK_ARC_GLOW_TARGET_COLOR,
  ATTACK_ARC_SOURCE_COLOR,
  ATTACK_ARC_TARGET_COLOR,
  ATTACK_ARROWHEAD_COLOR,
} from 'map/layers/tokens';
import { THREAT_LABEL_LAYER_ID } from 'map/layers/threat-labels';

function getIconLayerProps(): IconLayerProps<TwoDArcDatum> {
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
    getColor: ATTACK_ARROWHEAD_COLOR,
    getSize: (datum) => Math.min(18, 11 + datum.count * 0.55),
    sizeUnits: 'pixels',
    pickable: false,
    beforeId: THREAT_LABEL_LAYER_ID,
  };

  return props;
}

export async function buildAttackArcLayers(context: LayerRenderContext): Promise<Layer[]> {
  const data = await buildTwoDArcData(context.data);
  const glowLayerProps = {
    id: 'attack-arcs-glow',
    data,
    getSourcePosition: (datum: TwoDArcDatum) => datum.source,
    getTargetPosition: (datum: TwoDArcDatum) => datum.target,
    getSourceColor: ATTACK_ARC_GLOW_SOURCE_COLOR,
    getTargetColor: ATTACK_ARC_GLOW_TARGET_COLOR,
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
    getSourceColor: ATTACK_ARC_SOURCE_COLOR,
    getTargetColor: ATTACK_ARC_TARGET_COLOR,
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
  return [
    new IconLayer<TwoDArcDatum>({
      ...getIconLayerProps(),
      id: 'attack-arrowheads',
      data,
    }),
  ];
}
