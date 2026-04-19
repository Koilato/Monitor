import type { CountryHoverResponse } from '@shared/types';
import type { HoverCountryState, PopupAnchor } from '../lib/types';

interface IncidentPopupProps {
  country: HoverCountryState | null;
  data: CountryHoverResponse | null;
  anchor: PopupAnchor | null;
  loading: boolean;
  error: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 480;
const EDGE_MARGIN = 16;

export function IncidentPopup(props: IncidentPopupProps) {
  const { country, data, anchor, loading, error } = props;

  if (!country || !anchor) {
    return null;
  }

  const maxLeft = window.innerWidth - POPUP_WIDTH - EDGE_MARGIN;
  const maxTop = window.innerHeight - POPUP_HEIGHT - EDGE_MARGIN;
  const left = anchor.mode === '2d'
    ? (anchor.placement === 'left' ? EDGE_MARGIN : maxLeft)
    : (anchor.placement === 'left' ? EDGE_MARGIN : maxLeft);
  const top = anchor.mode === '2d'
    ? clamp(anchor.y - 140, 88, maxTop)
    : clamp(anchor.y - 200, 96, maxTop);
  const flowCount = data?.flows.length ?? 0;

  return (
    <aside className="map-popup" style={{ left, top }}>
      <div className="popup-header hotspot">
        <span className="popup-title">{country.name} / {country.code}</span>
        {loading ? <span className="popup-badge medium">QUERY</span> : null}
        {!loading && !error ? <span className="popup-badge low">LIVE</span> : null}
      </div>

      <div className="popup-body">
        {error ? <p className="popup-description popup-error">{error}</p> : null}

        {!error && !loading && data ? (
          <>
            <div className="popup-subtitle">INCOMING ATTACK SUMMARY</div>
            <div className="popup-stats">
              <div className="popup-stat">
                <span className="stat-label">INCIDENTS</span>
                <span className="stat-value">{data.total}</span>
              </div>
              <div className="popup-stat">
                <span className="stat-label">ORIGINS</span>
                <span className="stat-value">{flowCount}</span>
              </div>
            </div>

            <div className="popup-section">
              <span className="section-label">FLOW SOURCES</span>
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
              <span className="section-label">INCIDENT LOG</span>
              <div className="popup-incident-list">
                {data.incidents.map((incident: CountryHoverResponse['incidents'][number]) => (
                  <article className="popup-incident-card" key={incident.uuid}>
                    <div className="popup-title-row">
                      <strong>{incident.details.title}</strong>
                      <span className={`popup-badge ${incident.details.severity}`}>
                        {incident.details.severity}
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
          <p className="popup-description">No incidents for the current filters.</p>
        ) : null}
      </div>
    </aside>
  );
}
