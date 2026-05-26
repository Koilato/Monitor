import type {
  EventLevel,
  ThreatIntelQuery,
  ThreatIntelResponse,
} from '../../../shared/types.js';
import type { StorageRepository } from '../storage/repository.js';
import {
  buildGeneratedAt,
  getCountryLabel,
  SEVERITY_TO_THREAT_INTEL,
} from './common.js';

export function createThreatIntelComputeService(repository: StorageRepository) {
  return {
    getThreatIntelFeed(query: ThreatIntelQuery): ThreatIntelResponse {
      const clauses: string[] = [];
      const params: string[] = [];

      if (query.startDate) {
        clauses.push('occurred_date >= ?');
        params.push(query.startDate);
      }
      if (query.endDate) {
        clauses.push('occurred_date <= ?');
        params.push(query.endDate);
      }
      if (query.severity) {
        clauses.push('severity = ?');
        params.push(query.severity);
      }
      if (query.victimCountry) {
        clauses.push('victim_country = ?');
        params.push(query.victimCountry);
      }
      if (query.attackerCountry) {
        clauses.push('attacker_country = ?');
        params.push(query.attackerCountry);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const orderClause = query.sort === 'asc'
        ? 'ORDER BY occurred_at ASC, id ASC'
        : 'ORDER BY occurred_at DESC, id DESC';
      const rows = repository.all<{
        id: string;
        occurred_at: string;
        attacker_country: string;
        victim_country: string;
        severity: EventLevel;
        title: string;
        source_label: string;
        source_address: string;
      }>(
        `SELECT
          id,
          occurred_at,
          attacker_country,
          victim_country,
          severity,
          title,
          source_label,
          source_address
        FROM incidents
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?`,
        [...params, String(query.limit), String(query.offset)],
      );
      const totalRow = repository.get<{ total: number }>(
        `SELECT COUNT(*) AS total FROM incidents ${whereClause}`,
        params,
      );

      return {
        sort: query.sort,
        total: totalRow?.total ?? 0,
        limit: query.limit,
        offset: query.offset,
        generatedAt: buildGeneratedAt(),
        items: rows.map((row) => ({
          id: row.id,
          ...SEVERITY_TO_THREAT_INTEL[row.severity],
          severity: row.severity,
          victim: row.title,
          attacker: getCountryLabel(row.attacker_country),
          source: row.source_address,
          address: getCountryLabel(row.victim_country),
          attackerCountry: row.attacker_country,
          victimCountry: row.victim_country,
          occurredAt: row.occurred_at,
        })),
      };
    },
  };
}
