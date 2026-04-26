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
