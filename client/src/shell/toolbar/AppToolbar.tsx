import type { TimeFilterState, TimePreset } from 'map/state/map-state';
import 'shell/styles/toolbar.css';

interface AppToolbarProps {
  viewMode: '2d' | '3d';
  timeFilter: TimeFilterState;
  debugModeEnabled: boolean;
  statusTone: 'live' | 'warning' | 'error';
  statusLabel: string;
  onViewModeChange: (mode: '2d' | '3d') => void;
  onTimeFilterChange: (filter: TimeFilterState) => void;
  onDebugModeToggle: () => void;
}

const TIME_PRESETS: TimePreset[] = ['1h', '6h', '24h', '48h', '7d'];

export function AppToolbar(props: AppToolbarProps) {
  const {
    viewMode,
    timeFilter,
    debugModeEnabled,
    statusTone,
    statusLabel,
    onViewModeChange,
    onTimeFilterChange,
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

      <div className="map-dimension-toggle" role="group" aria-label="Time presets">
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`map-dim-btn ${timeFilter.mode === 'preset' && timeFilter.preset === preset ? 'active' : ''}`}
            onClick={() => onTimeFilterChange({
              mode: 'preset',
              preset,
              startDate: null,
              endDate: null,
            })}
          >
            {preset.toUpperCase()}
          </button>
        ))}
      </div>

      <label className="map-filter-field">
        <span className="map-filter-label">START</span>
        <input
          type="date"
          value={timeFilter.mode === 'custom' ? timeFilter.startDate ?? '' : ''}
          onChange={(event) => onTimeFilterChange({
            mode: 'custom',
            preset: null,
            startDate: event.target.value || null,
            endDate: timeFilter.mode === 'custom' ? timeFilter.endDate : null,
          })}
        />
      </label>

      <label className="map-filter-field">
        <span className="map-filter-label">END</span>
        <input
          type="date"
          value={timeFilter.mode === 'custom' ? timeFilter.endDate ?? '' : ''}
          onChange={(event) => onTimeFilterChange({
            mode: 'custom',
            preset: null,
            startDate: timeFilter.mode === 'custom' ? timeFilter.startDate : null,
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
        aria-label={`SIGNAL CONSOLE ${statusLabel} GLOBAL MAP LIVE MAPLIBRE URL STATE`}
      >
        <div className="map-brand-panel-top">
          <span className="map-brand-title">SIGNAL CONSOLE</span>
          <span className={`map-brand-status ${statusTone}`}>
            <span className={`status-dot ${statusTone}`} />
            <span className="map-brand-status-label">{statusLabel}</span>
          </span>
        </div>
        <div className="map-brand-panel-bottom">
          <span className="map-brand-banner">GLOBAL MAP</span>
          <span className="map-brand-meta">LIVE / MAPLIBRE / URL</span>
        </div>
      </div>
    </div>
  );
}
