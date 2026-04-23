import { threatIntelMockData } from 'shell/lib/mock-threat-intel';

const tickerItems = threatIntelMockData.map((item) => ({
  id: item.id,
  tone: item.tone,
  text: `${item.level} / ${item.victim} / ${item.attacker} / ${item.source}`,
  timestamp: item.timestamp,
}));

function TickerLane(props: { reverse?: boolean; laneSuffix: string }) {
  const { reverse = false, laneSuffix } = props;

  return (
    <div className={`ticker-lane${reverse ? ' ticker-lane--reverse' : ''}`}>
      <div className="ticker-track">
        {[0, 1].map((copyIndex) => (
          <div
            key={`${laneSuffix}-${copyIndex}`}
            className="ticker-segment"
            aria-hidden={copyIndex === 1}
          >
            {tickerItems.map((item) => (
              <article key={`${laneSuffix}-${copyIndex}-${item.id}`} className={`ticker-item ticker-item--${item.tone}`}>
                <span className={`ticker-item-pill ticker-item-pill--${item.tone}`}>{item.tone}</span>
                <span className="ticker-item-text">{item.text}</span>
                <span className="ticker-item-time">{item.timestamp}</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThreatTickerPanel() {
  return (
    <section className="ticker-panel">
      <header className="ticker-panel-header">
        <div>
          <span className="ticker-panel-title">Signal Ticker</span>
          <span className="ticker-panel-subtitle">continuous mock stream</span>
        </div>
      </header>

      <div className="ticker-panel-body">
        <TickerLane laneSuffix="a" />
        <TickerLane reverse laneSuffix="b" />
      </div>
    </section>
  );
}
