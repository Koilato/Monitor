import type { LatestContentResponse } from '@shared/types';

interface LatestFeedPanelProps {
  data: LatestContentResponse | null;
  loading: boolean;
  error: string | null;
}

function formatUtcTimestamp(value: string): string {
  return `${new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value))} `;
}

function formatCategoryLabel(category: string): string {
  if (category === 'sql') {
    return 'SQL';
  }
  if (category === 'ops') {
    return '运维';
  }
  if (category === 'research') {
    return '研究';
  }
  return category;
}

export function LatestFeedPanel(props: LatestFeedPanelProps) {
  const { data, loading, error } = props;

  return (
    <>
      <div className="latest-header">
        <div className="latest-header-left">
          <span className="latest-title">最新信息流</span>
          <span className="latest-subtitle">分类 / 最新记录</span>
        </div>
        <div className="latest-header-right">
          {data ? `${data.total} 条` : '实时信息流'}
        </div>
      </div>

      <div className="latest-list">
        {loading ? (
          <div className="latest-empty">正在加载最新内容...</div>
        ) : error ? (
          <div className="latest-empty latest-empty--error">{error}</div>
        ) : data && data.items.length > 0 ? (
          data.items.map((item, index) => {
            const rank = data.offset + index + 1;

            return (
              <article key={item.id} className="latest-card">
                <div className="latest-card-top">
                  <span className="latest-rank">#{rank}</span>
                  <span className="latest-pill">{formatCategoryLabel(item.category)}</span>
                  <span className="latest-time">{formatUtcTimestamp(item.createdAt)}</span>
                </div>
                <h3 className="latest-card-title">{item.title}</h3>
                <p className="latest-card-summary">{item.summary}</p>
              </article>
            );
          })
        ) : (
          <div className="latest-empty">当前分类没有匹配内容。</div>
        )}
      </div>
    </>
  );
}
