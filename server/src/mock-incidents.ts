import type { HoverIncident } from '../../shared/types.js';

export const MOCK_INCIDENTS: HoverIncident[] = [
  {
    uuid: 'mock-001',
    date: '2026-04-01',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: 'JP probe against coastal network',
      summary: 'Simulated reconnaissance traffic against an eastern China public-sector subnet.',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-002',
    date: '2026-04-02',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: 'JP phishing run against logistics vendor',
      summary: 'Credential harvesting campaign aimed at a shipping services supplier.',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-003',
    date: '2026-04-03',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: 'JP exploit attempt on regional portal',
      summary: 'Automated exploit sweep observed on an exposed web application.',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-004',
    date: '2026-04-04',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: 'JP disruption against telecom edge',
      summary: 'Short-lived disruption attempt targeting a provincial telecom edge node.',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-005',
    date: '2026-04-05',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: 'US scanner burst against cloud tenant',
      summary: 'Simulated scanner wave detected against a China-hosted cloud tenant.',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-006',
    date: '2026-04-06',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: 'US intrusion against manufacturing node',
      summary: 'Privilege escalation attempt aimed at a manufacturing control gateway.',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-007',
    date: '2026-04-07',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: 'US payload delivery to university mail',
      summary: 'Malicious attachment campaign against a university email cluster.',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-008',
    date: '2026-04-08',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: 'US lateral movement simulation',
      summary: 'Multi-stage access attempt on a CN enterprise identity provider.',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-009',
    date: '2026-04-09',
    attackerCountry: 'CN',
    victimCountry: 'US',
    details: {
      title: 'CN spearphishing against US contractor',
      summary: 'Targeted phishing emails directed at a US defense-adjacent contractor.',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-010',
    date: '2026-04-10',
    attackerCountry: 'CN',
    victimCountry: 'US',
    details: {
      title: 'CN attack against US SaaS control plane',
      summary: 'Simulated account takeover activity against a US SaaS admin endpoint.',
      severity: 'high',
    },
  },
];
