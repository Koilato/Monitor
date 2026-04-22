import type { LatestContentResponse } from '@shared/types';

interface LatestFeedPanelProps {
  data: LatestContentResponse | null;
  loading: boolean;
  error: string | null;
}

function formatUtcTimestamp(value: string): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value))} UTC`;
}

export function LatestFeedPanel(props: LatestFeedPanelProps) {
  const { data, loading, error } = props;

  return (
    <>
      <div className="latest-header">
        <div className="latest-header-left">
          <span className="latest-title">Latest Feed</span>
          <span className="latest-subtitle">category / newest rows</span>
        </div>
        <div className="latest-header-right">
          {data ? `${data.total} rows` : 'LIVE FEED'}
        </div>
      </div>

      <div className="latest-list">
        {loading ? (
          <div className="latest-empty">Loading latest content...</div>
        ) : error ? (
          <div className="latest-empty latest-empty--error">{error}</div>
        ) : data && data.items.length > 0 ? (
          data.items.map((item, index) => {
            const rank = data.offset + index + 1;

            return (
              <article key={item.id} className="latest-card">
                <div className="latest-card-top">
                  <span className="latest-rank">#{rank}</span>
                  <span className="latest-pill">{item.category}</span>
                  <span className="latest-time">{formatUtcTimestamp(item.createdAt)}</span>
                </div>
                <h3 className="latest-card-title">{item.title}</h3>
                <p className="latest-card-summary">{item.summary}</p>
              </article>
            );
          })
        ) : (
          <div className="latest-empty">No content matched the current category.</div>
        )}
      </div>
    </>
  );
}
