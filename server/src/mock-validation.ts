import type { HoverIncidentSeed, LatestContentItemSeed } from '../../shared/types.js';
import { ValidationError, normalizeCountryCode, normalizeDate } from './validation.js';

const INCIDENT_SEVERITIES = new Set<HoverIncidentSeed['details']['severity']>([
  'low',
  'medium',
  'high',
]);

function assertNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new ValidationError('必须是非空字符串');
  }
  return normalized;
}

function assertIncident(incident: unknown, index: number): void {
  if (typeof incident !== 'object' || incident === null) {
    throw new ValidationError(`第 ${index + 1} 条事件必须是对象`);
  }

  const row = incident as Partial<HoverIncidentSeed>;
  const prefix = `incident[${index}]`;

  assertNonEmptyString(row.uuid, `${prefix}.uuid`);
  normalizeDate(row.date, `${prefix}.date`);
  normalizeCountryCode(row.attackerCountry, `${prefix}.attackerCountry`);
  normalizeCountryCode(row.victimCountry, `${prefix}.victimCountry`);

  if (typeof row.details !== 'object' || row.details === null) {
    throw new ValidationError(`第 ${index + 1} 条事件的详情必须是对象`);
  }

  const details = row.details as Partial<HoverIncidentSeed['details']>;
  assertNonEmptyString(details.title, `${prefix}.details.title`);
  assertNonEmptyString(details.summary, `${prefix}.details.summary`);

  if (!INCIDENT_SEVERITIES.has(details.severity as HoverIncidentSeed['details']['severity'])) {
    throw new ValidationError(`第 ${index + 1} 条事件的严重级别必须是低、中或高`);
  }
}

function assertLatestContentItem(item: unknown, index: number): void {
  if (typeof item !== 'object' || item === null) {
    throw new ValidationError(`第 ${index + 1} 条内容必须是对象`);
  }

  const row = item as Partial<LatestContentItemSeed>;
  const prefix = `latestContent[${index}]`;

  assertNonEmptyString(row.id, `${prefix}.id`);
  assertNonEmptyString(row.category, `${prefix}.category`);
  assertNonEmptyString(row.title, `${prefix}.title`);
  assertNonEmptyString(row.summary, `${prefix}.summary`);

  const createdAt = assertNonEmptyString(row.createdAt, `${prefix}.createdAt`);
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new ValidationError(`第 ${index + 1} 条内容的创建时间必须是有效的时间戳`);
  }
}

export function validateMockIncidents(incidents: HoverIncidentSeed[]): void {
  if (!Array.isArray(incidents) || incidents.length === 0) {
    throw new ValidationError('模拟事件数据必须是非空数组');
  }

  const uuids = new Set<string>();

  incidents.forEach((incident, index) => {
    assertIncident(incident, index);

    if (uuids.has(incident.uuid)) {
      throw new ValidationError(`第 ${index + 1} 条事件的编号必须唯一`);
    }

    uuids.add(incident.uuid);
  });
}

export function validateMockFeed(items: LatestContentItemSeed[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('模拟内容数据必须是非空数组');
  }

  const ids = new Set<string>();

  items.forEach((item, index) => {
    assertLatestContentItem(item, index);

    if (ids.has(item.id)) {
      throw new ValidationError(`第 ${index + 1} 条内容的编号必须唯一`);
    }

    ids.add(item.id);
  });
}
