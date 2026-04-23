import type {
  CountryHoverQuery,
  CountryHoverResponse,
  EventLevel,
  HoverFlow,
  HoverIncident,
  LatestContentItem,
  LatestContentQuery,
  LatestContentResponse,
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

export function buildFlows(incidents: HoverIncident[]): HoverFlow[] {
  const byAttacker = new Map<string, HoverFlow>();

  for (const incident of incidents) {
    const key = `${incident.attackerCountry}->${incident.victimCountry}`;
    const existing = byAttacker.get(key);

    if (existing) {
      existing.count += 1;
      existing.uuids.push(incident.uuid);
      continue;
    }

    byAttacker.set(key, {
      attackerCountry: incident.attackerCountry,
      victimCountry: incident.victimCountry,
      count: 1,
      uuids: [incident.uuid],
    });
  }

  return [...byAttacker.values()].sort((left, right) => right.count - left.count);
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
