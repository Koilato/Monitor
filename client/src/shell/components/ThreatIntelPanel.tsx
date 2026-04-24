import { threatIntelMockData, type ThreatIntelItem, type ThreatTone } from 'shell/lib/mock-threat-intel';

const toneLabelMap: Record<ThreatTone, string> = {
  critical: '高危',
  warning: '告警',
  info: '情报',
};

function ThreatIntelCard(props: { item: ThreatIntelItem }) {
  const { item } = props;

  return (
    <article className={`intel-card intel-card--${item.tone}`}>
      <div className="intel-card-top">
        <span className="intel-pill">{item.level}</span>
        <span className="intel-time">{item.timestamp}</span>
      </div>

      <div className="intel-meta">
        <div className="intel-block">
          <span className="intel-label">受害者 (VICTIM)</span>
          <strong className="intel-value">{item.victim}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">攻击组织 (ATTACKER)</span>
          <strong className={`intel-value intel-value--${item.tone}`}>{item.attacker}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">攻击源 (SOURCE)</span>
          <strong className="intel-value">{item.source}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">受害者地址 (ADDRESS)</span>
          <strong className="intel-value">{item.address}</strong>
        </div>
      </div>
    </article>
  );
}

export function ThreatIntelPanel() {
  return (
    <section className="intel-panel">
      <header className="intel-panel-header">
        <div>
          <span className="intel-panel-title">Threat Watchlist</span>
          <span className="intel-panel-subtitle">mock incident queue / left-top panel</span>
        </div>
        <span className="intel-panel-status">{threatIntelMockData.length} queued</span>
      </header>

      <div className="intel-list">
        {threatIntelMockData.map((item) => (
          <ThreatIntelCard key={item.id} item={item} />
        ))}
      </div>

      <footer className="intel-panel-footer">
        {Object.entries(toneLabelMap).map(([tone, label]) => (
          <span key={tone} className={`intel-legend intel-legend--${tone}`}>
            {label}
          </span>
        ))}
      </footer>
    </section>
  );
}
