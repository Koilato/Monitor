import type { CountryHoverResponse } from '@shared/types';
import type { HoverCountryState, PopupAnchor } from 'map/state/map-types';
import { getPopupPosition } from 'map/lib/popup-layout';

interface IncidentPopupProps {
  country: HoverCountryState | null;
  data: CountryHoverResponse | null;
  anchor: PopupAnchor | null;
  loading: boolean;
  error: string | null;
}

export function IncidentPopup(props: IncidentPopupProps) {
  const { country, data, anchor, loading, error } = props;

  if (!country || !anchor) {
    return null;
  }

  const position = getPopupPosition(anchor);
  const flowCount = data?.flows.length ?? 0;
  const severityLabelMap: Record<'low' | 'medium' | 'high', string> = {
    low: '低',
    medium: '中',
    high: '高',
  };

  return (
    <aside className="map-popup" style={position}>
      <div className="popup-header hotspot">
        <span className="popup-title">{country.name} / {country.code}</span>
        {loading ? <span className="popup-badge medium">查询中</span> : null}
        {!loading && !error ? <span className="popup-badge low">实时</span> : null}
      </div>

      <div className="popup-body">
        {error ? <p className="popup-description popup-error">{error}</p> : null}

        {!error && !loading && data ? (
          <>
            <div className="popup-subtitle">入站攻击摘要</div>
            <div className="popup-stats">
              <div className="popup-stat">
                <span className="stat-label">事件数</span>
                <span className="stat-value">{data.total}</span>
              </div>
              <div className="popup-stat">
                <span className="stat-label">来源数</span>
                <span className="stat-value">{flowCount}</span>
              </div>
            </div>

            <div className="popup-section">
              <span className="section-label">流向来源</span>
              <div className="popup-flow-list">
                {data.flows.map((flow: CountryHoverResponse['flows'][number]) => (
                  <div className="popup-flow-row" key={`${flow.attackerCountry}-${flow.victimCountry}`}>
                    <span>{flow.attackerCountry} → {flow.victimCountry}</span>
                    <span className="popup-flow-count">{flow.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="popup-section">
              <span className="section-label">事件日志</span>
              <div className="popup-incident-list">
                {data.incidents.map((incident: CountryHoverResponse['incidents'][number]) => (
                  <article className="popup-incident-card" key={incident.uuid}>
                    <div className="popup-title-row">
                      <strong>{incident.details.title}</strong>
                      <span className={`popup-badge ${incident.details.severity}`}>
                        {severityLabelMap[incident.details.severity]}
                      </span>
                    </div>
                    <p className="popup-description">{incident.details.summary}</p>
                    <div className="popup-incident-meta">
                      <span>{incident.uuid}</span>
                      <span>{incident.date}</span>
                      <span>{incident.attackerCountry} → {incident.victimCountry}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {!loading && !error && !data ? (
          <p className="popup-description">当前筛选条件下没有事件。</p>
        ) : null}
      </div>
    </aside>
  );
}
