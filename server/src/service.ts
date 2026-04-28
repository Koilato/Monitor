import type {
  AllFlowResponse,
  CountryHoverQuery,
  CountryHoverResponse,
  EventLevel,
  HoverFlow,
  HoverIncident,
  LatestContentItem,
  LatestContentQuery,
  LatestContentResponse,
  ThreatIntelItem,
  ThreatIntelQuery,
  ThreatIntelResponse,
  ThreatCountryStat,
  ThreatMapQuery,
  ThreatMapResponse,
  ThreatSeverityCounts,
} from '../../shared/types.js';

const EVENT_LEVEL_PRIORITY: Record<EventLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const COUNTRY_LABELS: Record<string, string> = {
  AU: '澳大利亚',
  BE: '比利时',
  BR: '巴西',
  CA: '加拿大',
  CN: '中国',
  DE: '德国',
  DK: '丹麦',
  ES: '西班牙',
  FR: '法国',
  GB: '英国',
  IN: '印度',
  IT: '意大利',
  JP: '日本',
  KR: '韩国',
  NL: '荷兰',
  NO: '挪威',
  PL: '波兰',
  RU: '俄罗斯',
  SE: '瑞典',
  SG: '新加坡',
  TR: '土耳其',
  US: '美国',
};

const SEVERITY_TO_THREAT_INTEL: Record<EventLevel, Pick<ThreatIntelItem, 'tone' | 'level'>> = {
  high: {
    tone: 'critical',
    level: '严重',
  },
  medium: {
    tone: 'warning',
    level: '警告',
  },
  low: {
    tone: 'info',
    level: '提示',
  },
};

export function filterIncidents(
  incidents: HoverIncident[],
  query: CountryHoverQuery,
): HoverIncident[] {
  return incidents.filter((incident) => {
    if (incident.victimCountry !== query.victimCountry) {
      return false;
    }
    if (query.startDate && incident.date < query.startDate) {
      return false;
    }
    if (query.endDate && incident.date > query.endDate) {
      return false;
    }
    return true;
  });
}

function aggregateFlows(
  incidents: HoverIncident[],
  includeDateRange = false,
): HoverFlow[] {
  const byAttacker = new Map<string, HoverFlow>();

  for (const incident of incidents) {
    const key = `${incident.attackerCountry}->${incident.victimCountry}`;
    const existing = byAttacker.get(key);

    if (existing) {
      existing.count += 1;
      existing.uuids.push(incident.uuid);
      if (includeDateRange) {
        existing.firstDate = existing.firstDate && existing.firstDate < incident.date
          ? existing.firstDate
          : incident.date;
        existing.lastDate = existing.lastDate && existing.lastDate > incident.date
          ? existing.lastDate
          : incident.date;
      }
      continue;
    }

    const entry: HoverFlow = {
      attackerCountry: incident.attackerCountry,
      victimCountry: incident.victimCountry,
      count: 1,
      uuids: [incident.uuid],
    };

    if (includeDateRange) {
      entry.firstDate = incident.date;
      entry.lastDate = incident.date;
    }

    byAttacker.set(key, entry);
  }

  return [...byAttacker.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const attackerDelta = left.attackerCountry.localeCompare(right.attackerCountry);
    if (attackerDelta !== 0) {
      return attackerDelta;
    }

    return left.victimCountry.localeCompare(right.victimCountry);
  });
}

export function buildFlows(incidents: HoverIncident[]): HoverFlow[] {
  return aggregateFlows(incidents);
}

export function buildAllFlows(incidents: HoverIncident[]): HoverFlow[] {
  return aggregateFlows(incidents, true);
}

export function buildCountryHoverResponse(
  incidents: HoverIncident[],
  query: CountryHoverQuery,
): CountryHoverResponse {
  const matched = filterIncidents(incidents, query);

  return {
    victimCountry: query.victimCountry,
    startDate: query.startDate,
    endDate: query.endDate,
    total: matched.length,
    incidents: matched,
    flows: buildFlows(matched),
  };
}

export function buildAllFlowResponse(
  incidents: HoverIncident[],
  query: ThreatMapQuery,
): AllFlowResponse {
  const matched = filterIncidentsByDate(incidents, query);
  const flows = buildAllFlows(matched);

  return {
    startDate: query.startDate,
    endDate: query.endDate,
    total: flows.length,
    flows,
  };
}

function filterIncidentsByDate(
  incidents: HoverIncident[],
  query: ThreatMapQuery,
): HoverIncident[] {
  return incidents.filter((incident) => {
    if (query.startDate && incident.date < query.startDate) {
      return false;
    }
    if (query.endDate && incident.date > query.endDate) {
      return false;
    }
    return true;
  });
}

function createSeverityCounts(): ThreatSeverityCounts {
  return {
    low: 0,
    medium: 0,
    high: 0,
  };
}

function resolveMaxEventLevel(current: EventLevel, next: EventLevel): EventLevel {
  return EVENT_LEVEL_PRIORITY[next] > EVENT_LEVEL_PRIORITY[current]
    ? next
    : current;
}

export function buildThreatMapResponse(
  incidents: HoverIncident[],
  query: ThreatMapQuery,
): ThreatMapResponse {
  const matched = filterIncidentsByDate(incidents, query);

  const byCountry = new Map<string, ThreatCountryStat>();
  let total = 0;

  for (const incident of matched) {
    total += 1;
    const existing = byCountry.get(incident.victimCountry);
    const severity = incident.details.severity;

    if (existing) {
      existing.incidentCount += 1;
      existing.severityCounts[severity] += 1;
      existing.eventLevel = resolveMaxEventLevel(existing.eventLevel, severity);
      continue;
    }

    const severityCounts = createSeverityCounts();
    severityCounts[severity] += 1;

    byCountry.set(incident.victimCountry, {
      country: incident.victimCountry,
      incidentCount: 1,
      severityCounts,
      eventLevel: severity,
    });
  }

  return {
    startDate: query.startDate,
    endDate: query.endDate,
    total,
    countries: [...byCountry.values()].sort((left, right) => {
      const levelPriorityDelta = EVENT_LEVEL_PRIORITY[right.eventLevel] - EVENT_LEVEL_PRIORITY[left.eventLevel];
      if (levelPriorityDelta !== 0) {
        return levelPriorityDelta;
      }
      if (right.incidentCount !== left.incidentCount) {
        return right.incidentCount - left.incidentCount;
      }
      return left.country.localeCompare(right.country);
    }),
  };
}

export function buildLatestContentResponse(
  items: LatestContentItem[],
  query: LatestContentQuery,
): LatestContentResponse {
  const matched = items
    .filter((item) => item.category === query.category)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const sliced = matched.slice(query.offset, query.offset + query.limit);

  return {
    category: query.category,
    total: matched.length,
    limit: query.limit,
    offset: query.offset,
    items: sliced,
  };
}

function getCountryLabel(countryCode: string): string {
  return COUNTRY_LABELS[countryCode] ?? countryCode;
}

function hashText(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function buildIncidentOccurredAt(incident: HoverIncident, index: number): string {
  const hash = hashText(incident.uuid);
  const minuteOfDay = (index * 37 + hash) % (24 * 60);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const second = hash % 60;

  return `${incident.date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;
}

function buildIncidentSource(incident: HoverIncident): string {
  const hash = hashText(`${incident.uuid}:${incident.attackerCountry}`);
  const firstOctet = 10 + (hash % 214);
  const secondOctet = 1 + (Math.floor(hash / 214) % 254);

  return `${firstOctet}.${secondOctet}.x.x (${incident.attackerCountry})`;
}

export function buildThreatIntelItemsFromIncidents(incidents: HoverIncident[]): ThreatIntelItem[] {
  return incidents.map((incident, index) => {
    const severity = SEVERITY_TO_THREAT_INTEL[incident.details.severity];
    const attackerLabel = getCountryLabel(incident.attackerCountry);
    const victimLabel = getCountryLabel(incident.victimCountry);

    return {
      id: incident.uuid,
      tone: severity.tone,
      level: severity.level,
      victim: incident.details.title,
      attacker: attackerLabel,
      source: buildIncidentSource(incident),
      address: victimLabel,
      occurredAt: buildIncidentOccurredAt(incident, index),
    };
  });
}

function compareThreatIntelItems(left: ThreatIntelResponse['items'][number], right: ThreatIntelResponse['items'][number], sort: ThreatIntelQuery['sort']): number {
  if (left.occurredAt !== right.occurredAt) {
    return sort === 'asc'
      ? left.occurredAt.localeCompare(right.occurredAt)
      : right.occurredAt.localeCompare(left.occurredAt);
  }

  return sort === 'asc'
    ? left.id.localeCompare(right.id)
    : right.id.localeCompare(left.id);
}

export function buildThreatIntelResponse(
  items: ThreatIntelResponse['items'],
  query: ThreatIntelQuery,
): ThreatIntelResponse {
  const sorted = [...items].sort((left, right) => compareThreatIntelItems(left, right, query.sort));
  const sliced = sorted.slice(query.offset, query.offset + query.limit);

  return {
    sort: query.sort,
    total: sorted.length,
    limit: query.limit,
    offset: query.offset,
    items: sliced,
  };
}
