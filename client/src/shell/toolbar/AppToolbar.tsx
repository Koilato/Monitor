import type { FlowMode, FlowPlaybackMode, TimeFilterState, TimePreset } from 'map/state/map-state';

interface AppToolbarProps {
  viewMode: '2d' | '3d';
  timeFilter: TimeFilterState;
  flowMode: FlowMode;
  flowPlaybackMode: FlowPlaybackMode;
  debugModeEnabled: boolean;
  statusTone: 'live' | 'warning' | 'error';
  statusLabel: string;
  onViewModeChange: (mode: '2d' | '3d') => void;
  onTimeFilterChange: (filter: TimeFilterState) => void;
  onFlowModeChange: (mode: FlowMode) => void;
  onFlowPlaybackModeChange: (mode: FlowPlaybackMode) => void;
  onDebugModeToggle: () => void;
}

const FLOW_PLAYBACK_MODES: Array<{ label: string; value: FlowPlaybackMode; title: string }> = [
  { label: 'FIFO', value: 'fifo', title: 'First in, first out' },
  { label: 'CNTRY', value: 'country', title: 'Group by attacker country' },
  { label: 'TIME', value: 'time', title: 'Sort by incident time' },
];

const TIME_PRESETS: TimePreset[] = ['1d', '2d', '7d'];

export function AppToolbar(props: AppToolbarProps) {
  const {
    viewMode,
    timeFilter,
    flowMode,
    flowPlaybackMode,
    debugModeEnabled,
    statusTone,
    statusLabel,
    onViewModeChange,
    onTimeFilterChange,
    onFlowModeChange,
    onFlowPlaybackModeChange,
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

      <div className="map-dimension-toggle" role="group" aria-label="Flow playback mode">
        <button
          type="button"
          className={`map-dim-btn ${flowMode === 'allflow' ? 'active' : ''}`}
          aria-pressed={flowMode === 'allflow'}
          onClick={() => onFlowModeChange(flowMode === 'allflow' ? 'hover' : 'allflow')}
          title="Show all flows in the current date range"
        >
          ALLFLOW
        </button>
        {FLOW_PLAYBACK_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className={`map-dim-btn ${flowPlaybackMode === mode.value ? 'active' : ''}`}
            aria-pressed={flowPlaybackMode === mode.value}
            onClick={() => onFlowPlaybackModeChange(mode.value)}
            title={mode.title}
          >
            {mode.label}
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
            <span className="status-dot" />
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
