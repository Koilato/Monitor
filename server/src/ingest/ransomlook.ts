import { createHash } from 'node:crypto';
import type { IncidentUpstreamRow } from '../storage/repository.js';

const API_BASE_URL = 'https://www.ransomlook.io/api';

type RansomLookPost = Record<string, unknown>;

function getApiKey(): string | null {
  return process.env.RANSOMLOOK_API_KEY?.trim() || null;
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

function firstString(row: RansomLookPost, keys: string[]): string {
  for (const key of keys) {
    const value = asString(row[key]).trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function isIso2CountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

function normalizeCountry(row: RansomLookPost): string {
  const value = firstString(row, [
    'country',
    'country_code',
    'victim_country',
    'victimCountry',
  ]).trim().toUpperCase();

  return isIso2CountryCode(value) ? value : '';
}

function hashId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`ransomlook request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function getPostsFromPayload(payload: unknown): RansomLookPost[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is RansomLookPost => row != null && typeof row === 'object');
  }
  if (payload && typeof payload === 'object') {
    const posts = (payload as { posts?: unknown }).posts;
    return Array.isArray(posts)
      ? posts.filter((row): row is RansomLookPost => row != null && typeof row === 'object')
      : [];
  }
  return [];
}

function normalizePost(row: RansomLookPost, ingestedAt: string): IncidentUpstreamRow | null {
  const victimCountry = normalizeCountry(row);
  if (!victimCountry) {
    return null;
  }

  const groupName = firstString(row, ['group_name', 'groupName', 'group']);
  const victim = firstString(row, ['post_title', 'victim', 'title', 'name']);
  if (!groupName || !victim) {
    return null;
  }

  const discovered = firstString(row, ['discovered', 'created_at', 'updated_at', 'date']);
  const attackdate = firstString(row, ['published', 'attackdate', 'attack_date', 'date']);
  const stableSourceId = firstString(row, ['id', '_id', 'slug', 'url', 'post_url'])
    || `${victim}@${groupName}@${discovered || attackdate}`;

  return {
    id: `ransomlook:${hashId(stableSourceId)}`,
    victim,
    groupName,
    victimCountry,
    activity: firstString(row, ['activity', 'sector', 'industry']),
    attackdate,
    discovered,
    description: firstString(row, ['description', 'summary', 'content']) || null,
    website: firstString(row, ['website', 'domain']),
    permalink: firstString(row, ['permalink', 'url']),
    postUrl: firstString(row, ['post_url', 'postUrl', 'url']),
    press: firstString(row, ['press']),
    infostealerJson: JSON.stringify(null),
    ransomRaw: '',
    screenshot: firstString(row, ['screenshot']),
    ingestedAt,
    rawJson: JSON.stringify(row),
  };
}

export async function fetchRansomLookRows(): Promise<IncidentUpstreamRow[]> {
  const ingestedAt = new Date().toISOString();
  const payload = await fetchJson<unknown>('/export/2');
  if (!payload) {
    return [];
  }

  const deduped = new Map<string, IncidentUpstreamRow>();
  for (const post of getPostsFromPayload(payload)) {
    const row = normalizePost(post, ingestedAt);
    if (row) {
      deduped.set(row.id, row);
    }
  }
  return [...deduped.values()];
}
