import type { LatestContentItemSeed } from '../../shared/types.js';

export const MOCK_LATEST_CONTENT: LatestContentItemSeed[] = [
  {
    id: 'sql-010',
    category: 'sql',
    title: 'SQL 库存同步完成',
    summary: '最新一批记录已从报表数据库导入，并标记为可审核。',
    createdAt: '2026-04-19T08:05:00Z',
  },
  {
    id: 'sql-009',
    category: 'sql',
    title: 'SQL 异常告警触发',
    summary: '一条新记录命中异常规则，并被推送到列表顶部。',
    createdAt: '2026-04-19T07:42:00Z',
  },
  {
    id: 'sql-008',
    category: 'sql',
    title: 'SQL 分类审计导出',
    summary: 'SQL 分类的审计导出已完成，最新变更已保存。',
    createdAt: '2026-04-19T07:15:00Z',
  },
  {
    id: 'sql-007',
    category: 'sql',
    title: 'SQL 导入任务完成',
    summary: '上游服务的新内容已写入最新内容表。',
    createdAt: '2026-04-19T06:58:00Z',
  },
  {
    id: 'sql-006',
    category: 'sql',
    title: 'SQL 记录补全成功',
    summary: '缺失记录已恢复并合并到当前最新列表。',
    createdAt: '2026-04-19T06:31:00Z',
  },
  {
    id: 'ops-005',
    category: 'ops',
    title: '运维队列健康检查通过',
    summary: '最近一次对账后，运维队列仍保持正常。',
    createdAt: '2026-04-19T06:20:00Z',
  },
  {
    id: 'ops-004',
    category: 'ops',
    title: '运维保留策略已应用',
    summary: '较旧的运维条目已压缩，最新记录仍保持可见。',
    createdAt: '2026-04-19T06:05:00Z',
  },
  {
    id: 'research-003',
    category: 'research',
    title: '研究简报已发布',
    summary: '最新研究条目已汇总到信息流中，便于快速浏览。',
    createdAt: '2026-04-19T05:48:00Z',
  },
];
