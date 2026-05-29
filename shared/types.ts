export type CountryCode = string;

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export type EventLevel = 'low' | 'medium' | 'high';

export interface IncidentDetails {
  title: string;
  summary: string;
  severity: EventLevel;
}

export interface HoverIncidentSeed {
  uuid: string;
  date: string;
  attackerCountry: CountryCode;
  victimCountry: CountryCode;
  ransomAmount?: number;
  details: IncidentDetails;
}

export interface ThreatSeverityCounts {
  low: number;
  medium: number;
  high: number;
}

export interface ThreatCountryStat {
  country: CountryCode;
  incidentCount: number;
  severityCounts: ThreatSeverityCounts;
  eventLevel: EventLevel;
}

export interface HoverFlow {
  attackerCountry: CountryCode;
  attackerCountryName?: string;
  victimCountry: CountryCode;
  victimCountryName?: string;
  count: number;
  severityCounts: ThreatSeverityCounts;
  flowLevel: EventLevel;
  flowLevelLabel?: string;
  uuids: string[];
  firstDate: string | null;
  lastDate: string | null;
}

export interface HoverIncident {
  id: string;
  uuid: string;
  occurredAt: string;
  occurredAtLabel?: string;
  occurredDate: string;
  date: string;
  attackerCountry: CountryCode;
  attackerCountryName?: string;
  victimCountry: CountryCode;
  victimCountryName?: string;
  severity: EventLevel;
  severityLabel?: string;
  ransomAmount: number;
  ransomAmountLabel?: string;
  title: string;
  summary: string;
  summaryRaw?: string | null;
  details: IncidentDetails;
  sourceLabel: string;
  groupName?: string;
  sourceAddress: string;
  linkUrl?: string;
}

export interface CountryHoverResponse {
  victimCountry: CountryCode;
  victimCountryName?: string;
  startDate: string | null;
  endDate: string | null;
  rangeLabel?: string;
  total: number;
  totalIncidents: number;
  sourceCount: number;
  incidents: HoverIncident[];
  flows: HoverFlow[];
  generatedAt: string;
}

export interface AllFlowResponse {
  startDate: string | null;
  endDate: string | null;
  total: number;
  totalFlows: number;
  flows: HoverFlow[];
  generatedAt: string;
}

export interface CountryHoverQuery extends DateRange {
  victimCountry: CountryCode;
}

export interface ThreatMapQuery extends DateRange {}

export interface ThreatMapResponse {
  startDate: string | null;
  endDate: string | null;
  total: number;
  totalIncidents: number;
  countries: ThreatCountryStat[];
  generatedAt: string;
}

export interface ThreatTrendDay {
  date: string;
  low: number;
  medium: number;
  high: number;
  total: number;
}

export interface ThreatTrendResponse {
  startDate: string | null;
  endDate: string | null;
  total: number;
  days: ThreatTrendDay[];
  generatedAt: string;
}

export interface RansomwareKpiResponse {
  startDate: string | null;
  endDate: string | null;
  max: number | null;
  median: number | null;
  avg: number | null;
  generatedAt: string;
}

export type ThreatIntelSortOrder = 'asc' | 'desc';

export interface ThreatIntelItem {
  id: string;
  tone: 'critical' | 'warning' | 'info';
  level: string;
  severity: EventLevel;
  victim: string;
  attacker: string;
  source: string;
  address: string;
  linkUrl: string;
  attackerCountry: CountryCode;
  victimCountry: CountryCode;
  occurredAt: string;
}

export interface ThreatIntelQuery extends DateRange {
  sort: ThreatIntelSortOrder;
  limit: number;
  offset: number;
  severity?: EventLevel | null;
  victimCountry?: CountryCode | null;
  attackerCountry?: CountryCode | null;
}

export interface ThreatIntelResponse {
  sort: ThreatIntelSortOrder;
  total: number;
  limit: number;
  offset: number;
  items: ThreatIntelItem[];
  generatedAt: string;
}
