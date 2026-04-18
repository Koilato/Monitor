import type { PanelConfig, MapLayers, DataSourceId } from '@/types';
import { SITE_VARIANT } from './variant';
// boundary-ignore: isDesktopRuntime is a pure env probe with no service dependencies
import { isDesktopRuntime } from '@/services/runtime';

const _desktop = isDesktopRuntime();

// ============================================
// PANEL CONFIGS (simplified — only 3 panels)
// ============================================
const BASE_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Global Map', enabled: true, priority: 1 },
  'country-info': { name: 'Country Info', enabled: true, priority: 1 },
  'risk-indicators': { name: 'Risk Indicators', enabled: true, priority: 1 },
};

const FULL_PANELS: Record<string, PanelConfig> = { ...BASE_PANELS };
const TECH_PANELS: Record<string, PanelConfig> = { ...BASE_PANELS };
const FINANCE_PANELS: Record<string, PanelConfig> = { ...BASE_PANELS };
const HAPPY_PANELS: Record<string, PanelConfig> = { ...BASE_PANELS };
const COMMODITY_PANELS: Record<string, PanelConfig> = { ...BASE_PANELS };

// ============================================
// MAP LAYERS (kept for map functionality)
// ============================================
const FULL_MAP_LAYERS: MapLayers = {
  iranAttacks: !_desktop,
  gpsJamming: false,
  satellites: false,
  conflicts: true,
  bases: !_desktop,
  cables: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: true,
  irradiators: false,
  radiationWatch: false,
  sanctions: true,
  weather: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: true,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  resilienceScore: false,
  dayNight: false,
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  diseaseOutbreaks: false,
};

const FULL_MOBILE_MAP_LAYERS: MapLayers = {
  iranAttacks: true,
  gpsJamming: false,
  satellites: false,
  conflicts: true,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: true,
  ais: false,
  nuclear: false,
  irradiators: false,
  radiationWatch: false,
  sanctions: true,
  weather: true,
  economic: false,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  stockExchanges: false,
  financialCenters: false,
  centralBanks: false,
  commodityHubs: false,
  gulfInvestments: false,
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  ciiChoropleth: false,
  resilienceScore: false,
  dayNight: false,
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  diseaseOutbreaks: false,
};

const TECH_MAP_LAYERS: MapLayers = { ...FULL_MAP_LAYERS };
const TECH_MOBILE_MAP_LAYERS: MapLayers = { ...FULL_MOBILE_MAP_LAYERS };
const FINANCE_MAP_LAYERS: MapLayers = { ...FULL_MAP_LAYERS };
const FINANCE_MOBILE_MAP_LAYERS: MapLayers = { ...FULL_MOBILE_MAP_LAYERS };
const HAPPY_MAP_LAYERS: MapLayers = { ...FULL_MAP_LAYERS };
const HAPPY_MOBILE_MAP_LAYERS: MapLayers = { ...FULL_MOBILE_MAP_LAYERS };
const COMMODITY_MAP_LAYERS: MapLayers = { ...FULL_MAP_LAYERS };
const COMMODITY_MOBILE_MAP_LAYERS: MapLayers = { ...FULL_MOBILE_MAP_LAYERS };

// ============================================
// UNIFIED PANEL REGISTRY
// ============================================

/** All panels from all variants — union with FULL taking precedence for duplicate keys. */
export const ALL_PANELS: Record<string, PanelConfig> = {
  ...HAPPY_PANELS,
  ...COMMODITY_PANELS,
  ...TECH_PANELS,
  ...FINANCE_PANELS,
  ...FULL_PANELS,
};

/** Per-variant canonical panel order (keys = which panels are enabled by default). */
export const VARIANT_DEFAULTS: Record<string, string[]> = {
  full:      Object.keys(FULL_PANELS),
  tech:      Object.keys(TECH_PANELS),
  finance:   Object.keys(FINANCE_PANELS),
  commodity: Object.keys(COMMODITY_PANELS),
  happy:     Object.keys(HAPPY_PANELS),
};

/**
 * Variant-specific label overrides for panels shared across variants.
 * Applied at render time, not just at seed time.
 */
export const VARIANT_PANEL_OVERRIDES: Partial<Record<string, Partial<Record<string, Partial<PanelConfig>>>>> = {
  finance: {
    map:         { name: 'Global Markets Map' },
  },
  tech: {
    map:         { name: 'Global Tech Map' },
  },
  commodity: {
    map:         { name: 'Commodity Map' },
  },
  happy: {
    map:         { name: 'World Map' },
  },
};

/**
 * Returns the effective panel config for a given key and variant,
 * applying variant-specific display overrides (name, premium, etc.).
 */
export function getEffectivePanelConfig(key: string, variant: string): PanelConfig {
  const base = ALL_PANELS[key];
  if (!base) return { name: key, enabled: false, priority: 2 };
  const override = VARIANT_PANEL_OVERRIDES[variant]?.[key] ?? {};
  return { ...base, ...override };
}

// ============================================
// VARIANT-AWARE EXPORTS
// ============================================
export const DEFAULT_PANELS: Record<string, PanelConfig> = Object.fromEntries(
  (VARIANT_DEFAULTS[SITE_VARIANT] ?? VARIANT_DEFAULTS['full'] ?? []).map(key =>
    [key, getEffectivePanelConfig(key, SITE_VARIANT)]
  )
);

export const DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy'
  ? HAPPY_MAP_LAYERS
  : SITE_VARIANT === 'tech'
    ? TECH_MAP_LAYERS
    : SITE_VARIANT === 'finance'
      ? FINANCE_MAP_LAYERS
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MAP_LAYERS
        : FULL_MAP_LAYERS;

export const MOBILE_DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy'
  ? HAPPY_MOBILE_MAP_LAYERS
  : SITE_VARIANT === 'tech'
    ? TECH_MOBILE_MAP_LAYERS
    : SITE_VARIANT === 'finance'
      ? FINANCE_MOBILE_MAP_LAYERS
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MOBILE_MAP_LAYERS
        : FULL_MOBILE_MAP_LAYERS;

/** Maps map-layer toggle keys to their data-freshness source IDs (single source of truth). */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  natural: ['usgs'],
  weather: ['weather'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  protests: ['acled', 'gdelt_doc'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
  climate: ['climate'],
  sanctions: ['sanctions_pressure'],
  radiationWatch: ['radiation'],
};

// ============================================
// PANEL CATEGORY MAP (simplified)
// ============================================
export const PANEL_CATEGORY_MAP: Record<string, { labelKey: string; panelKeys: string[]; variants?: string[] }> = {
  core: {
    labelKey: 'header.panelCatCore',
    panelKeys: ['map', 'country-info', 'risk-indicators'],
  },
};

// Monitor palette — fixed category colors persisted to localStorage (not theme-dependent)
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'worldmonitor-panels',
  monitors: 'worldmonitor-monitors',
  mapLayers: 'worldmonitor-layers',
  disabledFeeds: 'worldmonitor-disabled-feeds',
} as const;
