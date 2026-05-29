import { createHash } from 'node:crypto';
import type {
  GroupCountryMappingRow,
  IncidentUpstreamRow,
} from '../storage/repository.js';

const API_BASE_URL = 'https://api-pro.ransomware.live';
const RECENT_VICTIMS_ORDER = 'attacked';
const TARGET_VICTIM_COUNT = 1200;
const MIN_PRIORITY_ASIA_VICTIM_COUNT = 500;
const RECENT_MONTH_LOOKBACK = 36;
const ASIA_COUNTRY_YEAR_LOOKBACK = 5;
const ATTACKER_COUNTRY_POOL = ['US', 'CA', 'GB', 'DE', 'FR', 'NL', 'IT', 'ES', 'SE', 'PL', 'BE', 'DK', 'NO'] as const;
const PRIORITY_ASIA_VICTIM_COUNTRIES = [
  'CN',
  'JP',
  'RU',
  'KR',
  'IN',
  'SG',
  'HK',
  'TW',
  'ID',
  'MY',
  'PH',
  'TH',
  'VN',
  'TR',
  'SA',
  'AE',
  'IL',
  'IR',
  'KZ',
  'PK',
] as const;

interface ApiRecentVictim {
  activity?: unknown;
  attackdate?: unknown;
  country?: unknown;
  description?: unknown;
  discovered?: unknown;
  group?: unknown;
  id?: unknown;
  infostealer?: unknown;
  permalink?: unknown;
  post_url?: unknown;
  press?: unknown;
  ransom?: unknown;
  screenshot?: unknown;
  victim?: unknown;
  website?: unknown;
}

interface ApiGroupSummary {
  group?: unknown;
}

interface ApiVictimListingPayload {
  victims?: ApiRecentVictim[];
}

const NULL_DESCRIPTION_VALUES = new Set([
  '',
  'n/a',
  'na',
  '[ai generated] n/a',
  'null',
  'none',
  'unknown',
  'data is not available now.',
]);

function getApiKey(): string {
  const apiKey = process.env.RANSOMWARE_LIVE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing RANSOMWARE_LIVE_API_KEY environment variable');
  }
  return apiKey;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-KEY': getApiKey(),
    },
  });

  if (!response.ok) {
    throw new Error(`ransomware.live request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function asString(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function normalizeDescription(value: unknown): string | null {
  const description = asString(value).trim();
  if (NULL_DESCRIPTION_VALUES.has(description.toLowerCase())) {
    return null;
  }
  return description || null;
}

function hashToIndex(seed: string, modulo: number): number {
  const digest = createHash('sha256').update(seed).digest();
  return digest.readUIntBE(0, 6) % modulo;
}

function mapGroupToCountry(groupName: string): string {
  return ATTACKER_COUNTRY_POOL[hashToIndex(`group-country:${groupName}`, ATTACKER_COUNTRY_POOL.length)] ?? 'US';
}

function normalizeVictimRow(victim: ApiRecentVictim, ingestedAt: string): IncidentUpstreamRow {
  return {
    id: asString(victim.id),
    victim: asString(victim.victim),
    groupName: asString(victim.group),
    victimCountry: asString(victim.country).trim().toUpperCase(),
    activity: asString(victim.activity),
    attackdate: asString(victim.attackdate),
    discovered: asString(victim.discovered),
    description: normalizeDescription(victim.description),
    website: asString(victim.website),
    permalink: asString(victim.permalink),
    postUrl: asString(victim.post_url),
    press: asString(victim.press),
    infostealerJson: JSON.stringify(victim.infostealer ?? null),
    ransomRaw: asString(victim.ransom),
    screenshot: asString(victim.screenshot),
    ingestedAt,
    rawJson: JSON.stringify(victim),
  };
}

function getVictimsFromPayload(payload: ApiVictimListingPayload | ApiRecentVictim[]): ApiRecentVictim[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.victims) ? payload.victims : [];
}

function buildVictimsPath(params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  return `/victims/?${searchParams.toString()}`;
}

function getMonthCursor(offset: number): { year: number; month: number } {
  const current = new Date();
  const cursor = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - offset, 1));
  return {
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
  };
}

function compareVictimsByOccurredAt(left: IncidentUpstreamRow, right: IncidentUpstreamRow): number {
  const leftTime = left.attackdate || left.discovered;
  const rightTime = right.attackdate || right.discovered;
  return rightTime.localeCompare(leftTime) || right.discovered.localeCompare(left.discovered) || right.id.localeCompare(left.id);
}

function addNormalizedVictims(
  deduped: Map<string, IncidentUpstreamRow>,
  victims: ApiRecentVictim[],
  ingestedAt: string,
): void {
  for (const victim of victims) {
    const normalized = normalizeVictimRow(victim, ingestedAt);
    if (!normalized.id || !normalized.groupName || !normalized.victimCountry) {
      continue;
    }
    if (!deduped.has(normalized.id)) {
      deduped.set(normalized.id, normalized);
    }
  }
}

function getBackfillYears(lookbackYears: number): string[] {
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: lookbackYears }, (_, index) => String(currentYear - index));
}

async function fetchVictimRows(path: string, ingestedAt: string): Promise<IncidentUpstreamRow[]> {
  const payload = await fetchJson<ApiVictimListingPayload | ApiRecentVictim[]>(path);
  const deduped = new Map<string, IncidentUpstreamRow>();

  addNormalizedVictims(deduped, getVictimsFromPayload(payload), ingestedAt);
  return [...deduped.values()];
}

function selectVictimRows(rows: IncidentUpstreamRow[], limit: number): IncidentUpstreamRow[] {
  const sortedRows = [...rows].sort(compareVictimsByOccurredAt);
  const priorityCountries = new Set<string>(PRIORITY_ASIA_VICTIM_COUNTRIES);
  const priorityRows = sortedRows.filter((row) => priorityCountries.has(row.victimCountry));
  const selected = new Map<string, IncidentUpstreamRow>();

  for (const row of priorityRows.slice(0, Math.min(MIN_PRIORITY_ASIA_VICTIM_COUNT, limit))) {
    selected.set(row.id, row);
  }

  for (const row of sortedRows) {
    if (selected.size >= limit) {
      break;
    }
    selected.set(row.id, row);
  }

  return [...selected.values()].sort(compareVictimsByOccurredAt);
}

export async function fetchRecentVictimRows(limit = TARGET_VICTIM_COUNT): Promise<IncidentUpstreamRow[]> {
  const ingestedAt = new Date().toISOString();
  const deduped = new Map<string, IncidentUpstreamRow>();

  const recentPayload = await fetchJson<ApiVictimListingPayload | ApiRecentVictim[]>(
    `/victims/recent?order=${RECENT_VICTIMS_ORDER}`,
  );
  addNormalizedVictims(deduped, getVictimsFromPayload(recentPayload), ingestedAt);

  for (let monthOffset = 0; monthOffset < RECENT_MONTH_LOOKBACK; monthOffset += 1) {
    const { year, month } = getMonthCursor(monthOffset);
    const payload = await fetchJson<ApiVictimListingPayload | ApiRecentVictim[]>(
      `/victims/?year=${year}&month=${String(month).padStart(2, '0')}&date=${RECENT_VICTIMS_ORDER}`,
    );
    addNormalizedVictims(deduped, getVictimsFromPayload(payload), ingestedAt);
  }

  const backfillYears = getBackfillYears(ASIA_COUNTRY_YEAR_LOOKBACK);
  for (const country of PRIORITY_ASIA_VICTIM_COUNTRIES) {
    for (const year of backfillYears) {
      const rows = await fetchVictimRows(buildVictimsPath({
        country,
        year,
        date: RECENT_VICTIMS_ORDER,
      }), ingestedAt);
      for (const row of rows) {
        deduped.set(row.id, row);
      }
    }
  }

  return selectVictimRows([...deduped.values()], limit);
}

export async function fetchGroupCountryMappings(): Promise<GroupCountryMappingRow[]> {
  const payload = await fetchJson<{ groups?: ApiGroupSummary[] } | ApiGroupSummary[]>(
    '/groups',
  );
  const groupRows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.groups)
      ? payload.groups
      : [];
  const assignedAt = new Date().toISOString();
  const seen = new Set<string>();

  return groupRows
    .map((groupRow) => asString(groupRow.group).trim())
    .filter((groupName) => {
      if (!groupName || seen.has(groupName)) {
        return false;
      }
      seen.add(groupName);
      return true;
    })
    .map((groupName) => ({
      groupName,
      attackerCountry: mapGroupToCountry(groupName),
      assignedAt,
    }));
}
