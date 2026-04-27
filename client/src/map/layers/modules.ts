import type { LayerModule } from 'map/layers/registry';
import {
  applyCountriesBaseState,
  applyHoverHighlightState,
  applyThreatFillState,
  applyThreatGlowState,
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
  THREAT_GLOW_LAYER_ID,
  THREAT_OUTLINE_LAYER_ID,
} from 'map/layers/maplibre';
import {
  applyThreatLabelState,
  ensureThreatLabelSource,
  registerThreatLabelLayer,
  THREAT_LABEL_LAYER_ID,
} from 'map/layers/threat-labels';
import { THREAT_LEGEND } from 'map/layers/tokens';

const countriesBaseModule: LayerModule = {
  id: 'countries-base',
  label: '国家',
  defaultEnabled: true,
  styleLayerIds: [...COUNTRIES_BASE_LAYER_IDS],
  registerMapSources: ensureCountrySource,
  registerStyleLayers: registerCountriesBaseLayers,
  applyState: applyCountriesBaseState,
};

const threatHighlightModule: LayerModule = {
  id: 'threat-highlight',
  label: '威胁高亮',
  defaultEnabled: true,
  styleLayerIds: [THREAT_FILL_LAYER_ID, THREAT_OUTLINE_LAYER_ID, THREAT_GLOW_LAYER_ID],
  registerMapSources: ensureCountrySource,
  registerStyleLayers: registerThreatHighlightLayers,
  applyState(context) {
    applyThreatFillState(context);
    applyThreatOutlineState(context);
    applyThreatGlowState(context);
  },
  legend: THREAT_LEGEND,
};

const threatLabelsModule: LayerModule = {
  id: 'threat-labels',
  label: '威胁标签',
  defaultEnabled: true,
  styleLayerIds: [THREAT_LABEL_LAYER_ID],
  registerMapSources: ensureThreatLabelSource,
  registerStyleLayers: registerThreatLabelLayer,
  applyState: applyThreatLabelState,
};

const hoverHighlightModule: LayerModule = {
  id: 'hover-highlight',
  label: '悬停高亮',
  defaultEnabled: true,
  showInLayerControls: false,
  styleLayerIds: [...HOVER_HIGHLIGHT_LAYER_IDS],
  registerMapSources: ensureCountrySource,
  registerStyleLayers: registerHoverHighlightLayers,
  applyState: applyHoverHighlightState,
};

const attackArcsModule: LayerModule = {
  id: 'attack-arcs',
  label: '攻击弧线',
  defaultEnabled: true,
};

export const LAYER_MODULES: LayerModule[] = [
  countriesBaseModule,
  threatHighlightModule,
  threatLabelsModule,
  hoverHighlightModule,
  attackArcsModule,
];
