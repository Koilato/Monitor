import { createHash } from 'node:crypto';
import type { EventLevel } from '../../../shared/types.js';
import type { IncidentUpstreamRow } from '../storage/repository.js';

const DISTRIBUTION_SALT = 'worldmonitor:ransomware-live:v1';
const RANSOM_MEAN = 760_000;
const RANSOM_SIGMA = 220_000;
const RANSOM_MIN = 50_000;

export interface CompatIncident {
  id: string;
  uuid: string;
  occurredAt: string;
  occurredDate: string;
  date: string;
  attackerCountry: string;
  victimCountry: string;
  severity: EventLevel;
  ransomAmount: number;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceAddress: string;
}

function hashToUnitInterval(seed: string): number {
  const digest = createHash('sha256').update(seed).digest();
  const integer = digest.readUIntBE(0, 6);
  const normalized = integer / 0x1000000000000;
  return Math.min(Math.max(normalized, Number.EPSILON), 1 - Number.EPSILON);
}

function toStandardNormal(seed: string): number {
  const u1 = hashToUnitInterval(`${seed}:u1`);
  const u2 = hashToUnitInterval(`${seed}:u2`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function deriveSeverity(id: string, groupName: string): EventLevel {
  const zScore = toStandardNormal(`${DISTRIBUTION_SALT}:severity:${id}:${groupName}`);
  if (zScore < -1) {
    return 'low';
  }
  if (zScore > 1) {
    return 'high';
  }
  return 'medium';
}

function deriveRansomAmount(id: string, groupName: string, victim: string): number {
  const zScore = toStandardNormal(`${DISTRIBUTION_SALT}:ransom:${id}:${groupName}:${victim}`);
  return Math.max(RANSOM_MIN, Math.round(RANSOM_MEAN + (zScore * RANSOM_SIGMA)));
}

function normalizeOccurredAt(row: IncidentUpstreamRow): string {
  const attackdate = row.attackdate.trim();
  if (attackdate) {
    return attackdate;
  }

  const discovered = row.discovered.trim();
  if (discovered) {
    return discovered;
  }

  return row.ingestedAt;
}

function normalizeOccurredDate(occurredAt: string): string {
  const value = occurredAt.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function deriveCompatIncident(row: IncidentUpstreamRow, attackerCountry: string): CompatIncident {
  const occurredAt = normalizeOccurredAt(row);
  const occurredDate = normalizeOccurredDate(occurredAt);
  const title = row.victim.trim() || row.id;
  const summary = row.description?.trim() || row.victim.trim() || row.groupName;

  return {
    id: row.id,
    uuid: row.id,
    occurredAt,
    occurredDate,
    date: occurredDate,
    attackerCountry,
    victimCountry: row.victimCountry,
    severity: deriveSeverity(row.id, row.groupName),
    ransomAmount: deriveRansomAmount(row.id, row.groupName, row.victim),
    title,
    summary,
    sourceLabel: row.groupName,
    sourceAddress: row.postUrl || row.permalink,
  };
}
