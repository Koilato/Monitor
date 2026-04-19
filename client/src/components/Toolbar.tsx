import type { DateRange } from '@shared/types';
import '../styles/toolbar.css';

interface ToolbarProps {
  viewMode: '2d' | '3d';
  dateRange: DateRange;
  debugModeEnabled: boolean;
  statusTone: 'live' | 'warning' | 'error';
  statusLabel: string;
  onViewModeChange: (mode: '2d' | '3d') => void;
  onDateRangeChange: (range: DateRange) => void;
  onDebugModeToggle: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const {
    viewMode,
    dateRange,
    debugModeEnabled,
    statusTone,
    statusLabel,
    onViewModeChange,
    onDateRangeChange,
    onDebugModeToggle,
  } = props;

  return (
    <div className="map-header-actions">
      <div className="map-dimension-toggle" role="tablist" aria-label="Map mode">
        <button
          type="button"
          className={`map-dim-btn ${viewMode === '2d' ? 'active' : ''}`}
          onClick={() => onViewModeChange('2d')}
        >
          2D
        </button>
        <button
          type="button"
          className={`map-dim-btn ${viewMode === '3d' ? 'active' : ''}`}
          onClick={() => onViewModeChange('3d')}
        >
          3D
        </button>
      </div>

      <label className="map-filter-field">
        <span className="map-filter-label">START</span>
        <input
          type="date"
          value={dateRange.startDate ?? ''}
          onChange={(event) => onDateRangeChange({
            ...dateRange,
            startDate: event.target.value || null,
          })}
        />
      </label>

      <label className="map-filter-field">
        <span className="map-filter-label">END</span>
        <input
          type="date"
          value={dateRange.endDate ?? ''}
          onChange={(event) => onDateRangeChange({
            ...dateRange,
            endDate: event.target.value || null,
          })}
        />
      </label>

      <button
        type="button"
        className={`map-debug-mode-btn ${debugModeEnabled ? 'active' : ''}`}
        aria-pressed={debugModeEnabled}
        onClick={onDebugModeToggle}
      >
        {debugModeEnabled ? 'Debug On' : 'Debug Mode'}
      </button>

      <div
        className="map-brand-panel"
        role="status"
        aria-label={`WORLD MONITOR ${statusLabel} GLOBAL INCIDENT FLOW MAP API MOCK ISO2`}
      >
        <div className="map-brand-panel-top">
          <span className="map-brand-title">WORLD MONITOR</span>
          <span className={`map-brand-status ${statusTone}`}>
            <span className={`status-dot ${statusTone}`} />
            <span className="map-brand-status-label">{statusLabel}</span>
          </span>
        </div>
        <div className="map-brand-panel-bottom">
          <span className="map-brand-banner">GLOBAL INCIDENT FLOW MAP</span>
          <span className="map-brand-meta">API / MOCK / ISO2</span>
        </div>
      </div>
    </div>
  );
}
