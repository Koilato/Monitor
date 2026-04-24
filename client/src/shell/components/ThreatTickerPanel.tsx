import { threatIntelMockData } from 'shell/lib/mock-threat-intel';

type TickerDirection = 'up' | 'down';

const tickerItems = threatIntelMockData.map((item) => ({
  id: item.id,
  tone: item.tone,
  label: item.tone === 'critical'
    ? '警告'
    : item.tone === 'warning'
      ? '情报'
      : '新闻',
  text: `${item.victim} / ${item.attacker} / ${item.source}`,
  timestamp: item.timestamp,
}));

interface ThreatTickerPanelProps {
  direction?: TickerDirection;
}

export function ThreatTickerPanel(props: ThreatTickerPanelProps) {
  const { direction = 'down' } = props;

  return (
    <section className="ticker-panel">
      <header className="ticker-panel-header">
        <div>
          <span className="ticker-panel-title">Signal Ticker</span>
          <span className="ticker-panel-subtitle">vertical incident stream</span>
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
                  <span className="ticker-item-time">{item.timestamp}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
