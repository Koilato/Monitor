import type { PanelConfig, MapLayers, Monitor, MarketData, ClusteredEvent } from '@/types';

export type { CountryBriefSignals } from '@/types';

/** Loose type for the intelligence data cache used by correlation adapters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IntelligenceCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  earthquakes?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protests?: { events?: any[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outages?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  military?: { flights?: any[]; vessels?: any[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AppContext {
  map: import('@/components').MapContainer | null;
  readonly isMobile: boolean;
  readonly isDesktopApp: boolean;
  readonly container: HTMLElement;

  panels: Record<string, import('@/components').Panel>;
  newsPanels: Record<string, unknown>;
  panelSettings: Record<string, PanelConfig>;

  mapLayers: MapLayers;

  allNews: unknown[];
  newsByCategory: Record<string, unknown[]>;
  latestMarkets: MarketData[];
  latestPredictions: unknown[];
  latestClusters: ClusteredEvent[];
  intelligenceCache: IntelligenceCache;
  cyberThreatsCache: unknown[] | null;

  disabledSources: Set<string>;
  currentTimeRange: import('@/components').TimeRange;

  inFlight: Set<string>;
  seenGeoAlerts: Set<string>;
  monitors: Monitor[];

  signalModal: unknown | null;
  statusPanel: unknown | null;
  searchModal: unknown | null;
  findingsBadge: unknown | null;
  breakingBanner: unknown | null;
  playbackControl: unknown | null;
  exportPanel: unknown | null;
  unifiedSettings: unknown | null;
  pizzintIndicator: unknown | null;
  correlationEngine: unknown | null;
  llmStatusIndicator: unknown | null;
  countryBriefPage: unknown | null;
  countryTimeline: unknown | null;
  positivePanel: unknown | null;
  countersPanel: unknown | null;
  progressPanel: unknown | null;
  breakthroughsPanel: unknown | null;
  heroPanel: unknown | null;
  digestPanel: unknown | null;
  speciesPanel: unknown | null;
  renewablePanel: unknown | null;
  authModal: { open(): void; close(): void; destroy(): void } | null;
  authHeaderWidget: unknown | null;
  tvMode: unknown | null;
  happyAllItems: unknown[];
  isDestroyed: boolean;
  isPlaybackMode: boolean;
  isIdle: boolean;
  initialLoadComplete: boolean;
  resolvedLocation: 'global' | 'america' | 'mena' | 'eu' | 'asia' | 'latam' | 'africa' | 'oceania';

  initialUrlState: import('@/utils').ParsedMapUrlState | null;
  readonly PANEL_ORDER_KEY: string;
  readonly PANEL_SPANS_KEY: string;
}

export interface AppModule {
  init(): void | Promise<void>;
  destroy(): void;
}
