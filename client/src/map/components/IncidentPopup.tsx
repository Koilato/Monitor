import type { CountryHoverResponse } from '@shared/types';
import type { PopupAnchor, SelectedCountryState } from 'map/state/map-types';
import { getPopupPosition, type PopupViewport } from 'map/lib/popup-layout';

interface IncidentPopupProps {
  country: SelectedCountryState | null;
  data: CountryHoverResponse | null;
  anchor: PopupAnchor | null;
  viewport: PopupViewport | null;
  loading: boolean;
  error: string | null;
}

export function IncidentPopup(props: IncidentPopupProps) {
  const { country, data, anchor, viewport, loading, error } = props;

  if (!country || !anchor || !viewport) {
    return null;
  }

  const position = getPopupPosition(anchor, viewport);
  const flowCount = data?.flows.length ?? 0;
  const displayFlows = data?.flows.slice(0, 5) ?? [];
  const generatedAtLabel = data?.generatedAt ? new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(data.generatedAt)).replace(/\//g, '-') : '';

  return (
    <aside
      className="map-popup"
      style={position}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.scrollTop += event.deltaY;
      }}
    >
      <div className="popup-header hotspot">
        <div className="popup-header-copy">
          <span className="popup-title">{data?.victimCountryName ?? country.name}</span>
          <span className="popup-header-subtitle">国家事件面板</span>
        </div>
        {loading ? <span className="popup-badge medium">查询中</span> : null}
        {!loading && !error ? <span className="popup-badge low">实时</span> : null}
      </div>

      <div className="popup-body">
        {error ? <p className="popup-description popup-error">{error}</p> : null}

        {!error && !loading && data ? (
          <>
            <div className="popup-subtitle">总览</div>
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
            <div className="popup-meta-strip">
              <span>国家：{data.victimCountryName ?? country.name}</span>
              <span>范围：{data.rangeLabel ?? '最近样本'}</span>
              <span>更新：{generatedAtLabel}</span>
            </div>

            <div className="popup-section">
              <span className="section-label">来源分布</span>
              <div className="popup-flow-list">
                {displayFlows.map((flow: CountryHoverResponse['flows'][number]) => (
                  <div className="popup-flow-row" key={`${flow.attackerCountry}-${flow.victimCountry}`}>
                    <span>{flow.attackerCountryName ?? flow.attackerCountry}</span>
                    <span className="popup-flow-count">{flow.count} / {flow.flowLevelLabel ?? flow.flowLevel}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="popup-section">
              <span className="section-label">事件明细</span>
              <div className="popup-incident-list">
                {data.incidents.map((incident: CountryHoverResponse['incidents'][number]) => (
                  <a
                    className="popup-incident-card"
                    key={incident.uuid}
                    href={incident.linkUrl ?? incident.sourceAddress}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <div className="popup-title-row">
                      <strong>{incident.title}</strong>
                      <span className={`popup-badge ${incident.details.severity}`}>
                        {incident.severityLabel ?? incident.details.severity}
                      </span>
                    </div>
                    <div className="popup-incident-grid">
                      <span className="popup-key">时间</span>
                      <span className="popup-value">{incident.occurredAtLabel ?? incident.occurredAt}</span>
                      <span className="popup-key">攻击方</span>
                      <span className="popup-value">{incident.attackerCountryName ?? incident.attackerCountry}</span>
                      <span className="popup-key">组织</span>
                      <span className="popup-value">{incident.groupName ?? incident.sourceLabel}</span>
                      {incident.ransomAmount > 0 ? (
                        <>
                          <span className="popup-key">金额</span>
                          <span className="popup-value">{incident.ransomAmountLabel ?? incident.ransomAmount}</span>
                        </>
                      ) : null}
                    </div>
                    {incident.summaryRaw ? (
                      <>
                        <span className="section-label section-label--inline">摘要</span>
                        <p className="popup-description">{incident.summaryRaw}</p>
                      </>
                    ) : null}
                  </a>
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
