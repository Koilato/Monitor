import type { LatestContentItem } from '../../shared/types.js';

export const MOCK_LATEST_CONTENT: LatestContentItem[] = [
  {
    id: 'sql-010',
    category: 'sql',
    title: 'SQL inventory sync completed',
    summary: 'Latest row batch imported from the reporting database and marked ready for review.',
    createdAt: '2026-04-19T08:05:00Z',
  },
  {
    id: 'sql-009',
    category: 'sql',
    title: 'SQL anomaly alert raised',
    summary: 'A new record matched the anomaly rules and was pushed to the top of the feed.',
    createdAt: '2026-04-19T07:42:00Z',
  },
  {
    id: 'sql-008',
    category: 'sql',
    title: 'SQL export for category audit',
    summary: 'Audit export finished for the SQL category and the latest changes were persisted.',
    createdAt: '2026-04-19T07:15:00Z',
  },
  {
    id: 'sql-007',
    category: 'sql',
    title: 'SQL ingestion job finished',
    summary: 'Fresh content from the upstream service was inserted into the latest-content table.',
    createdAt: '2026-04-19T06:58:00Z',
  },
  {
    id: 'sql-006',
    category: 'sql',
    title: 'SQL row backfill succeeded',
    summary: 'Missing records were recovered and merged into the current latest feed.',
    createdAt: '2026-04-19T06:31:00Z',
  },
  {
    id: 'ops-005',
    category: 'ops',
    title: 'Ops queue health check passed',
    summary: 'Operational queue remained green after the most recent reconciliation run.',
    createdAt: '2026-04-19T06:20:00Z',
  },
  {
    id: 'ops-004',
    category: 'ops',
    title: 'Ops retention policy applied',
    summary: 'Older operational entries were compacted while the newest records stayed visible.',
    createdAt: '2026-04-19T06:05:00Z',
  },
  {
    id: 'research-003',
    category: 'research',
    title: 'Research digest published',
    summary: 'The newest research items were grouped into a feed for quick scanning.',
    createdAt: '2026-04-19T05:48:00Z',
  },
];
