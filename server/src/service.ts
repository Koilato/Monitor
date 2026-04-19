import type {
  CountryHoverQuery,
  CountryHoverResponse,
  HoverFlow,
  HoverIncident,
  LatestContentItem,
  LatestContentQuery,
  LatestContentResponse,
} from '../../shared/types.js';

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
