import type { ThreatIntelItem } from '@shared/types';
import { formatThreatIntelTimestamp } from 'shell/lib/threat-intel';

type TickerDirection = 'up' | 'down';

interface ThreatTickerPanelProps {
  items: ThreatIntelItem[];
  direction?: TickerDirection;
}

export function ThreatTickerPanel(props: ThreatTickerPanelProps) {
  const { items, direction = 'down' } = props;

  const tickerItems = items.map((item) => ({
    id: item.id,
    tone: item.tone,
    label: item.tone === 'critical'
      ? '严重'
      : item.tone === 'warning'
        ? '告警'
        : '提示',
    text: `${item.victim} / ${item.attacker} / ${item.source}`,
    timestamp: item.occurredAt,
  }));

  return (
    <section className="ticker-panel">
      <header className="ticker-panel-header">
        <div>
          <span className="ticker-panel-title">信号滚动栏</span>
          <span className="ticker-panel-subtitle">纵向事件流</span>
        </div>
      </header>

      <div className="ticker-panel-body">
        <div className={`ticker-column${direction === 'down' ? ' ticker-column--down' : ''}`}>
          {[0, 1].map((copyIndex) => (
            <div
              key={copyIndex}
              className="ticker-column-segment"
              aria-hidden={copyIndex === 1}
            >
              {tickerItems.map((item) => (
                <article key={`${copyIndex}-${item.id}`} className="ticker-item">
                  <span className={`ticker-item-pill ticker-item-pill--${item.tone}`}>{item.label}</span>
                  <span className="ticker-item-text">{item.text}</span>
                  <span className="ticker-item-time">{formatThreatIntelTimestamp(item.timestamp)}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
