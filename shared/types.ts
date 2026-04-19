export type CountryCode = string;

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface IncidentDetails {
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
}

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface ThreatSeverityCounts {
  low: number;
  medium: number;
  high: number;
}

export interface ThreatCountryStat {
  country: CountryCode;
  incidentCount: number;
  severityCounts: ThreatSeverityCounts;
  threatScore: number;
  threatLevel: ThreatLevel;
}

export interface HoverIncident {
  uuid: string;
  date: string;
  attackerCountry: CountryCode;
  victimCountry: CountryCode;
  details: IncidentDetails;
}

export interface HoverFlow {
  attackerCountry: CountryCode;
  victimCountry: CountryCode;
  count: number;
  uuids: string[];
}

export interface CountryHoverResponse {
  victimCountry: CountryCode;
  startDate: string | null;
  endDate: string | null;
  total: number;
  incidents: HoverIncident[];
  flows: HoverFlow[];
}

export interface CountryHoverQuery extends DateRange {
  victimCountry: CountryCode;
}

export interface ThreatMapQuery extends DateRange {}

export interface ThreatMapResponse {
  startDate: string | null;
  endDate: string | null;
  total: number;
  countries: ThreatCountryStat[];
}

export interface LatestContentItem {
  id: string;
  category: string;
  title: string;
  summary: string;
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
}
