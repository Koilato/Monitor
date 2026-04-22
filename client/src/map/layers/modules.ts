import type { LayerModule } from 'map/layers/registry';
import {
  applyHoverHighlightState,
  applyThreatFillState,
  applyThreatOutlineState,
} from 'map/layers/effects';
import {
  COUNTRIES_BASE_LAYER_IDS,
  ensureCountrySource,
  HOVER_HIGHLIGHT_LAYER_IDS,
  registerCountriesBaseLayers,
  registerHoverHighlightLayers,
  registerThreatHighlightLayers,
  THREAT_FILL_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  buildAttackArcLayers,
  buildAttackArrowheadLayers,
} from 'map/layers/overlays';
import {
  applyThreatLabelState,
  ensureThreatLabelSource,
  registerThreatLabelLayer,
  THREAT_LABEL_LAYER_ID,
} from 'map/layers/threat-labels';
import { THREAT_LEGEND } from 'map/layers/tokens';

const countriesBaseModule: LayerModule = {
  id: 'countries-base',
  label: 'Countries',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: [...COUNTRIES_BASE_LAYER_IDS],
  registerMapSources: ensureCountrySource,
  registerStyleLayers: registerCountriesBaseLayers,
};

const threatHighlightModule: LayerModule = {
  id: 'threat-highlight',
  label: 'Threat Highlight',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: [THREAT_FILL_LAYER_ID, THREAT_OUTLINE_LAYER_ID],
  registerStyleLayers: registerThreatHighlightLayers,
  applyState(context) {
    applyThreatFillState(context);
    applyThreatOutlineState(context);
  },
  legend: THREAT_LEGEND,
};

const threatLabelsModule: LayerModule = {
  id: 'threat-labels',
  label: 'Threat Labels',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  styleLayerIds: [THREAT_LABEL_LAYER_ID],
  registerMapSources: ensureThreatLabelSource,
  registerStyleLayers: registerThreatLabelLayer,
  applyState: applyThreatLabelState,
};

const hoverHighlightModule: LayerModule = {
  id: 'hover-highlight',
  label: 'Hover Highlight',
  defaultEnabled: true,
  showInLayerControls: false,
  supportsView: ['2d', '3d'],
  styleLayerIds: [...HOVER_HIGHLIGHT_LAYER_IDS],
  registerStyleLayers: registerHoverHighlightLayers,
  applyState: applyHoverHighlightState,
};

const attackArcsModule: LayerModule = {
  id: 'attack-arcs',
  label: 'Attack Arcs',
  defaultEnabled: true,
  supportsView: ['2d', '3d'],
  async buildOverlayLayers(context) {
    const [arcLayers, arrowheadLayers] = await Promise.all([
      buildAttackArcLayers(context),
      buildAttackArrowheadLayers(context),
    ]);
    return [...arcLayers, ...arrowheadLayers];
  },
};

export const LAYER_MODULES: LayerModule[] = [
  countriesBaseModule,
  threatHighlightModule,
  threatLabelsModule,
  hoverHighlightModule,
  attackArcsModule,
];
