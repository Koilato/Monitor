import type { ThreatIntelSortOrder } from '@shared/types';

export function formatThreatIntelTimestamp(value: string): string {
  return `${new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value)).replace(/\//g, '-')} 协调世界时`;
}

export function toggleThreatIntelSortOrder(order: ThreatIntelSortOrder): ThreatIntelSortOrder {
  return order === 'desc' ? 'asc' : 'desc';
}

export function formatThreatIntelStatus(options: {
  total: number;
  sortOrder: ThreatIntelSortOrder;
  autoScrollEnabled: boolean;
  refreshEnabled: boolean;
  loading: boolean;
}): string {
  const { total, sortOrder, autoScrollEnabled, refreshEnabled, loading } = options;
  const orderLabel = sortOrder === 'desc' ? '倒序' : '正序';
  const scrollLabel = autoScrollEnabled ? '自动滚动开' : '自动滚动关';
  const refreshLabel = refreshEnabled ? '定时刷新开' : '定时刷新关';

  if (loading && total === 0) {
    return `${orderLabel} · 正在加载`;
  }

  return `${orderLabel} · ${scrollLabel} · ${refreshLabel} · ${total} 条`;
}
