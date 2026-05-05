import { createHash } from 'node:crypto';
import type { EventLevel, HoverIncidentSeed, LatestContentItemSeed } from '../../../shared/types.js';

export interface NormalizedIncident {
  id: string;
  externalId: string;
  occurredAt: string;
  occurredDate: string;
  attackerCountry: string;
  victimCountry: string;
  severity: EventLevel;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceAddress: string;
  dedupeKey: string;
}

export interface NormalizedContentItem {
  id: string;
  externalId: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  dedupeKey: string;
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildSourceAddress(externalId: string, attackerCountry: string): string {
  const hash = hashText(`${externalId}:${attackerCountry}`);
  const firstOctet = 10 + (hash % 214);
  const secondOctet = 1 + (Math.floor(hash / 214) % 254);
  return `${firstOctet}.${secondOctet}.x.x (${attackerCountry})`;
}

function ensureNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return normalized;
}

function ensureEventLevel(value: unknown): EventLevel {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  throw new Error('severity must be one of low, medium or high');
}

function ensureIsoTimestamp(value: string, fieldName: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO timestamp`);
  }
  return value;
}

function ensureIsoDate(value: string, fieldName: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must be a valid ISO date`);
  }
  return value;
}

function buildDedupeKey(parts: string[]): string {
  return createHash('sha1').update(parts.join('|')).digest('hex');
}

export function normalizeIncidentInput(record: unknown): NormalizedIncident {
  if (typeof record !== 'object' || record === null) {
    throw new Error('incident record must be an object');
  }

  const row = record as Partial<HoverIncidentSeed> & Record<string, unknown>;
  const externalId = ensureNonEmptyString(row.uuid ?? row.externalId ?? row.id, 'incident.externalId');
  const attackerCountry = ensureNonEmptyString(row.attackerCountry, 'incident.attackerCountry').toUpperCase();
  const victimCountry = ensureNonEmptyString(row.victimCountry, 'incident.victimCountry').toUpperCase();

  const details = (typeof row.details === 'object' && row.details !== null)
    ? row.details as HoverIncidentSeed['details']
    : null;

  const title = ensureNonEmptyString(row.title ?? details?.title, 'incident.title');
  const summary = ensureNonEmptyString(row.summary ?? details?.summary, 'incident.summary');
  const severity = ensureEventLevel(row.severity ?? details?.severity);
  const occurredDate = ensureIsoDate(
    ensureNonEmptyString(row.date ?? row.occurredDate ?? (typeof row.occurredAt === 'string' ? row.occurredAt.slice(0, 10) : ''), 'incident.occurredDate'),
    'incident.occurredDate',
  );
  const occurredAt = ensureIsoTimestamp(
    ensureNonEmptyString(row.occurredAt ?? `${occurredDate}T00:00:00Z`, 'incident.occurredAt'),
    'incident.occurredAt',
  );
  const sourceLabel = ensureNonEmptyString(
    row.sourceLabel ?? `Source ${attackerCountry}`,
    'incident.sourceLabel',
  );
  const sourceAddress = ensureNonEmptyString(
    row.sourceAddress ?? buildSourceAddress(externalId, attackerCountry),
    'incident.sourceAddress',
  );

  return {
    id: externalId,
    externalId,
    occurredAt,
    occurredDate,
    attackerCountry,
    victimCountry,
    severity,
    title,
    summary,
    sourceLabel,
    sourceAddress,
    dedupeKey: buildDedupeKey([externalId, attackerCountry, victimCountry, occurredAt]),
  };
}

export function normalizeContentInput(record: unknown): NormalizedContentItem {
  if (typeof record !== 'object' || record === null) {
    throw new Error('content record must be an object');
  }

  const row = record as Partial<LatestContentItemSeed> & Record<string, unknown>;
  const externalId = ensureNonEmptyString(row.id ?? row.externalId, 'content.externalId');
  const category = ensureNonEmptyString(row.category, 'content.category').toLowerCase();
  const title = ensureNonEmptyString(row.title, 'content.title');
  const summary = ensureNonEmptyString(row.summary, 'content.summary');
  const publishedAt = ensureIsoTimestamp(
    ensureNonEmptyString(row.publishedAt ?? row.createdAt, 'content.publishedAt'),
    'content.publishedAt',
  );

  return {
    id: externalId,
    externalId,
    category,
    title,
    summary,
    publishedAt,
    dedupeKey: buildDedupeKey([externalId, category, publishedAt]),
  };
}
