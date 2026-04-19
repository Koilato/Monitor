import type { HoverIncident, LatestContentItem } from '../../shared/types.js';
import { ValidationError, normalizeCountryCode, normalizeDate } from './validation.js';

const INCIDENT_SEVERITIES = new Set<HoverIncident['details']['severity']>([
  'low',
  'medium',
  'high',
]);

function assertNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
  return normalized;
}

function assertIncident(incident: unknown, index: number): void {
  if (typeof incident !== 'object' || incident === null) {
    throw new ValidationError(`incident[${index}] must be an object`);
  }

  const row = incident as Partial<HoverIncident>;
  const prefix = `incident[${index}]`;

  assertNonEmptyString(row.uuid, `${prefix}.uuid`);
  normalizeDate(row.date, `${prefix}.date`);
  normalizeCountryCode(row.attackerCountry, `${prefix}.attackerCountry`);
  normalizeCountryCode(row.victimCountry, `${prefix}.victimCountry`);

  if (typeof row.details !== 'object' || row.details === null) {
    throw new ValidationError(`${prefix}.details must be an object`);
  }

  const details = row.details as Partial<HoverIncident['details']>;
  assertNonEmptyString(details.title, `${prefix}.details.title`);
  assertNonEmptyString(details.summary, `${prefix}.details.summary`);

  if (!INCIDENT_SEVERITIES.has(details.severity as HoverIncident['details']['severity'])) {
    throw new ValidationError(`${prefix}.details.severity must be low, medium, or high`);
  }
}

function assertLatestContentItem(item: unknown, index: number): void {
  if (typeof item !== 'object' || item === null) {
    throw new ValidationError(`latestContent[${index}] must be an object`);
  }

  const row = item as Partial<LatestContentItem>;
  const prefix = `latestContent[${index}]`;

  assertNonEmptyString(row.id, `${prefix}.id`);
  assertNonEmptyString(row.category, `${prefix}.category`);
  assertNonEmptyString(row.title, `${prefix}.title`);
  assertNonEmptyString(row.summary, `${prefix}.summary`);

  const createdAt = assertNonEmptyString(row.createdAt, `${prefix}.createdAt`);
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new ValidationError(`${prefix}.createdAt must be a valid ISO timestamp`);
  }
}

export function validateMockIncidents(incidents: HoverIncident[]): void {
  if (!Array.isArray(incidents) || incidents.length === 0) {
    throw new ValidationError('mock incidents must be a non-empty array');
  }

  const uuids = new Set<string>();

  incidents.forEach((incident, index) => {
    assertIncident(incident, index);

    if (uuids.has(incident.uuid)) {
      throw new ValidationError(`incident[${index}].uuid must be unique`);
    }

    uuids.add(incident.uuid);
  });
}

export function validateMockFeed(items: LatestContentItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('mock feed must be a non-empty array');
  }

  const ids = new Set<string>();

  items.forEach((item, index) => {
    assertLatestContentItem(item, index);

    if (ids.has(item.id)) {
      throw new ValidationError(`latestContent[${index}].id must be unique`);
    }

    ids.add(item.id);
  });
}
