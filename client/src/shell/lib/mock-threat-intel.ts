export type ThreatTone = 'critical' | 'warning' | 'info';

export interface ThreatIntelItem {
  id: string;
  tone: ThreatTone;
  level: string;
  victim: string;
  attacker: string;
  source: string;
  address: string;
  timestamp: string;
}

export const threatIntelMockData: ThreatIntelItem[] = [
  {
    id: 'intel-001',
    tone: 'critical',
    level: 'Critical',
    victim: 'Global Finance Corp',
    attacker: 'Lazarus Group',
    source: '192.168.x.x (KR)',
    address: 'New York, US',
    timestamp: '2026-04-23 09:32:01 UTC',
  },
  {
    id: 'intel-002',
    tone: 'warning',
    level: 'Warning',
    victim: 'Cloud Infrastructure B',
    attacker: 'APT28',
    source: '45.12.x.x (RU)',
    address: 'Frankfurt, DE',
    timestamp: '2026-04-23 09:35:12 UTC',
  },
  {
    id: 'intel-003',
    tone: 'info',
    level: 'Info',
    victim: 'Internal Dev Server',
    attacker: 'Script Kiddie',
    source: '10.0.x.x (LOCAL)',
    address: 'Internal Network',
    timestamp: '2026-04-23 09:40:44 UTC',
  },
  {
    id: 'intel-004',
    tone: 'critical',
    level: 'Critical',
    victim: 'Maritime Logistics Hub',
    attacker: 'Volt Typhoon',
    source: '203.45.x.x (CN)',
    address: 'Singapore Port',
    timestamp: '2026-04-23 09:48:28 UTC',
  },
  {
    id: 'intel-005',
    tone: 'warning',
    level: 'Warning',
    victim: 'Regional Health Cluster',
    attacker: 'LockBit Affiliate',
    source: '91.77.x.x (BY)',
    address: 'Warsaw, PL',
    timestamp: '2026-04-23 09:56:03 UTC',
  },
];
