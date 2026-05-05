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
  victimCountry: CountryCode;
  count: number;
  uuids: string[];
  firstDate: string | null;
  lastDate: string | null;
}

export interface HoverIncident {
  id: string;
  uuid: string;
  occurredAt: string;
  occurredDate: string;
  date: string;
  attackerCountry: CountryCode;
  victimCountry: CountryCode;
  severity: EventLevel;
  title: string;
  summary: string;
  details: IncidentDetails;
  sourceLabel: string;
  sourceAddress: string;
}

export interface CountryHoverResponse {
  victimCountry: CountryCode;
  startDate: string | null;
  endDate: string | null;
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

export interface LatestContentItemSeed {
  id: string;
  category: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface LatestContentItem {
  id: string;
  externalId: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  createdAt: string;
}

export interface LatestContentQuery {
  category: string;
  limit: number;
  offset: number;
}

export interface LatestContentResponse {
  category: string;
  total: number;
  limit: number;
  offset: number;
  items: LatestContentItem[];
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
