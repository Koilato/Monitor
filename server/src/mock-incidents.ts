import type { HoverIncident } from '../../shared/types.js';

const BASE_MOCK_INCIDENTS: HoverIncident[] = [
  {
    uuid: 'mock-001',
    date: '2026-04-01',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: '日本对沿海网络的探测',
      summary: '针对中国东部某公共部门子网的模拟侦察流量。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-002',
    date: '2026-04-02',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: '日本对物流供应商的钓鱼活动',
      summary: '面向一家航运服务供应商的凭据窃取行动。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-003',
    date: '2026-04-03',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: '日本对区域门户的利用尝试',
      summary: '在一个暴露的 Web 应用上观察到自动化利用扫描。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-004',
    date: '2026-04-04',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: '日本对电信边缘的干扰',
      summary: '针对省级电信边缘节点的短暂干扰尝试。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-005',
    date: '2026-04-05',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: '美国对云租户的扫描突发',
      summary: '在一个部署于中国的云租户上检测到模拟扫描波次。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-006',
    date: '2026-04-06',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: '美国对制造节点的入侵',
      summary: '针对制造控制网关的提权尝试。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-007',
    date: '2026-04-07',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: '美国向高校邮件系统投递载荷',
      summary: '针对高校邮件集群的恶意附件活动。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-008',
    date: '2026-04-08',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: '美国横向移动模拟',
      summary: '针对中国企业身份提供方的多阶段访问尝试。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-009',
    date: '2026-04-09',
    attackerCountry: 'CN',
    victimCountry: 'US',
    details: {
      title: '中国对美国承包商的鱼叉式钓鱼',
      summary: '定向钓鱼邮件发往一家与国防相关的美国承包商。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-010',
    date: '2026-04-10',
    attackerCountry: 'CN',
    victimCountry: 'US',
    details: {
      title: '中国对美国 SaaS 控制平面的攻击',
      summary: '针对美国 SaaS 管理端点的模拟账户接管活动。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-011',
    date: '2026-04-11',
    attackerCountry: 'RU',
    victimCountry: 'JP',
    details: {
      title: '俄罗斯对零售门户的凭据喷洒',
      summary: '在日本零售身份服务上观察到高频登录尝试。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-012',
    date: '2026-04-12',
    attackerCountry: 'KR',
    victimCountry: 'SG',
    details: {
      title: '韩国对金融站点的网页篡改尝试',
      summary: '短暂的篡改流量指向了新加坡某金融服务落地页。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-013',
    date: '2026-04-13',
    attackerCountry: 'IN',
    victimCountry: 'AU',
    details: {
      title: '印度向教育网络投递恶意软件',
      summary: '可疑压缩附件被发送到澳大利亚一所大学的子网。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-014',
    date: '2026-04-14',
    attackerCountry: 'DE',
    victimCountry: 'GB',
    details: {
      title: '德国对媒体主机的扫描突发',
      summary: '在英国托管的媒体后端上观察到自动端口扫描。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-015',
    date: '2026-04-15',
    attackerCountry: 'BR',
    victimCountry: 'CA',
    details: {
      title: '巴西对云管理端的入侵尝试',
      summary: '针对加拿大云管理控制台的提权与令牌重放模拟。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-016',
    date: '2026-04-16',
    attackerCountry: 'FR',
    victimCountry: 'NL',
    details: {
      title: '法国面向物流人员的钓鱼波次',
      summary: '定向钓鱼邮件指向荷兰某企业物流团队。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-017',
    date: '2026-04-17',
    attackerCountry: 'ES',
    victimCountry: 'SE',
    details: {
      title: '西班牙对 API 网关的机器人活动',
      summary: '机器人驱动的请求洪泛命中了瑞典公共 API 网关。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-018',
    date: '2026-04-18',
    attackerCountry: 'IT',
    victimCountry: 'NO',
    details: {
      title: '意大利对能源仪表盘的利用探测',
      summary: '服务于挪威能源运营方的暴露仪表盘遭到利用探测。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-019',
    date: '2026-04-19',
    attackerCountry: 'PL',
    victimCountry: 'DK',
    details: {
      title: '波兰对 SaaS 租户的密码攻击',
      summary: '重复密码猜测针对丹麦某 SaaS 租户账户组。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-019a',
    date: '2026-04-19',
    attackerCountry: 'RU',
    victimCountry: 'CN',
    details: {
      title: '俄罗斯对中国门户的入侵突发',
      summary: '针对中国公共门户的严重入侵尝试模拟。',
      severity: 'high',
    },
  },
  {
    uuid: 'mock-019b',
    date: '2026-04-19',
    attackerCountry: 'US',
    victimCountry: 'CN',
    details: {
      title: '美国对中国云节点的凭据窃取尝试',
      summary: '一条中危凭据窃取尝试指向了中国托管的云节点。',
      severity: 'medium',
    },
  },
  {
    uuid: 'mock-019c',
    date: '2026-04-19',
    attackerCountry: 'JP',
    victimCountry: 'CN',
    details: {
      title: '日本对中国平台的扫描清扫',
      summary: '低危侦察流量被导向一个中国平台端点。',
      severity: 'low',
    },
  },
  {
    uuid: 'mock-020',
    date: '2026-04-20',
    attackerCountry: 'TR',
    victimCountry: 'BE',
    details: {
      title: '土耳其对政府门户的侦察',
      summary: '针对比利时政府门户的低慢速侦察模拟。',
      severity: 'low',
    },
  },
];

const COUNTRY_LABELS: Record<string, string> = {
  CN: '中国',
  US: '美国',
  JP: '日本',
  RU: '俄罗斯',
  KR: '韩国',
  IN: '印度',
  DE: '德国',
  BR: '巴西',
  FR: '法国',
  ES: '西班牙',
  IT: '意大利',
  PL: '波兰',
  TR: '土耳其',
  CA: '加拿大',
  AU: '澳大利亚',
  NL: '荷兰',
  SE: '瑞典',
  SG: '新加坡',
  BE: '比利时',
  GB: '英国',
  NO: '挪威',
  DK: '丹麦',
};

const ATTACKER_SEQUENCE = [
  'CN',
  'US',
  'JP',
  'RU',
  'KR',
  'IN',
  'DE',
  'FR',
  'BR',
  'ES',
  'IT',
  'PL',
  'TR',
  'CA',
  'AU',
  'NL',
];

const VICTIM_SEQUENCE = [
  'CN',
  'US',
  'JP',
  'SG',
  'GB',
  'DE',
  'FR',
  'AU',
  'CA',
  'NL',
  'SE',
  'NO',
  'DK',
  'BE',
  'IT',
  'ES',
];

const SEVERITY_SEQUENCE: HoverIncident['details']['severity'][] = [
  'low',
  'medium',
  'high',
  'medium',
  'low',
  'high',
  'medium',
  'high',
];

const ACTION_SEQUENCE = [
  '扫描',
  '钓鱼',
  '入侵尝试',
  '凭据喷洒',
  '横向移动',
  '利用探测',
  '机器人洪泛',
  '载荷投递',
  '权限提升',
  '会话劫持',
];

const TARGET_SEQUENCE = [
  '门户',
  '云租户',
  '邮件系统',
  '身份服务',
  'API 网关',
  '控制台',
  '业务面板',
  '边缘节点',
  '管理后台',
  '数据节点',
];

const SUMMARY_SEQUENCE = [
  '持续的自动化请求命中了暴露面',
  '模拟攻击流量在短时间内密集出现',
  '一条定向样本被发送到目标环境',
  '观察到与身份相关的异常访问尝试',
  '短暂的高频探测覆盖了关键入口',
  '一次低噪声的渗透前探测被记录',
];

function padDay(day: number): string {
  return String(day).padStart(2, '0');
}

function buildDateSchedule(total: number): string[] {
  const days = Array.from({ length: 26 }, (_, index) => index + 1);
  const weights = days.map((day) => {
    const distanceFromCenter = Math.abs(day - 13.5);
    return 1 + distanceFromCenter / 7;
  });

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const counts = weights.map((weight) => Math.floor((weight / weightSum) * total));

  let assigned = counts.reduce((sum, count) => sum + count, 0);
  const rankedDays = [...days].sort((left, right) => {
    const weightDelta = weights[right - 1] - weights[left - 1];
    return weightDelta !== 0 ? weightDelta : left - right;
  });

  for (let index = 0; assigned < total; index += 1) {
    const day = rankedDays[index % rankedDays.length];
    counts[day - 1] += 1;
    assigned += 1;
  }

  const schedule: string[] = [];
  days.forEach((day) => {
    const date = `2026-04-${padDay(day)}`;
    for (let count = 0; count < counts[day - 1]; count += 1) {
      schedule.push(date);
    }
  });

  return schedule;
}

function buildGeneratedIncidents(): HoverIncident[] {
  const dates = buildDateSchedule(200);

  return dates.map((date, index) => {
    const attackerCountry = ATTACKER_SEQUENCE[index % ATTACKER_SEQUENCE.length];
    const victimCountry = VICTIM_SEQUENCE[(index * 3 + 2) % VICTIM_SEQUENCE.length];
    const action = ACTION_SEQUENCE[index % ACTION_SEQUENCE.length];
    const target = TARGET_SEQUENCE[(index * 2 + 1) % TARGET_SEQUENCE.length];
    const summaryLead = SUMMARY_SEQUENCE[(index * 5 + 1) % SUMMARY_SEQUENCE.length];
    const severity = SEVERITY_SEQUENCE[index % SEVERITY_SEQUENCE.length];
    const attackerLabel = COUNTRY_LABELS[attackerCountry] ?? attackerCountry;
    const victimLabel = COUNTRY_LABELS[victimCountry] ?? victimCountry;
    const targetSuffix = index % 4 === 0 ? '资产' : index % 4 === 1 ? '入口' : index % 4 === 2 ? '服务' : '节点';

    return {
      uuid: `mock-${String(index + 21).padStart(3, '0')}`,
      date,
      attackerCountry,
      victimCountry,
      details: {
        title: `${attackerLabel}对${victimLabel}${target}${targetSuffix}的${action}`,
        summary: `${summaryLead}，${attackerLabel}的模拟活动指向${victimLabel}的${target}，呈现${severity}级别风险。`,
        severity,
      },
    };
  });
}

export const MOCK_INCIDENTS: HoverIncident[] = [
  ...BASE_MOCK_INCIDENTS,
  ...buildGeneratedIncidents(),
];
