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
