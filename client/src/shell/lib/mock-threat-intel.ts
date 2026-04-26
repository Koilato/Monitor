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
    level: '严重',
    victim: '全球金融集团',
    attacker: '拉撒路组织',
    source: '192.168.x.x (KR)',
    address: '纽约，美国',
    timestamp: '2026-04-23 09:32:01 协调世界时',
  },
  {
    id: 'intel-002',
    tone: 'warning',
    level: '警告',
    victim: '云基础设施 B',
    attacker: 'APT28',
    source: '45.12.x.x (RU)',
    address: '法兰克福，德国',
    timestamp: '2026-04-23 09:35:12 协调世界时',
  },
  {
    id: 'intel-003',
    tone: 'info',
    level: '提示',
    victim: '内部开发服务器',
    attacker: '脚本小子',
    source: '10.0.x.x (LOCAL)',
    address: '内部网络',
    timestamp: '2026-04-23 09:40:44 协调世界时',
  },
  {
    id: 'intel-004',
    tone: 'critical',
    level: '严重',
    victim: '海运物流枢纽',
    attacker: '伏特台风',
    source: '203.45.x.x (CN)',
    address: '新加坡港',
    timestamp: '2026-04-23 09:48:28 协调世界时',
  },
  {
    id: 'intel-005',
    tone: 'warning',
    level: '警告',
    victim: '区域医疗集群',
    attacker: 'LockBit 关联组织',
    source: '91.77.x.x (BY)',
    address: '华沙，波兰',
    timestamp: '2026-04-23 09:56:03 协调世界时',
  },
];
