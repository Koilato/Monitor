import type { FlowMode, FlowPlaybackMode, TimeFilterState, TimePreset } from 'map/state/map-state';

interface AppToolbarProps {
  timeFilter: TimeFilterState;
  flowMode: FlowMode;
  flowPlaybackMode: FlowPlaybackMode;
  debugModeEnabled: boolean;
  statusTone: 'live' | 'warning' | 'error';
  statusLabel: string;
  onTimeFilterChange: (filter: TimeFilterState) => void;
  onFlowModeChange: (mode: FlowMode) => void;
  onFlowPlaybackModeChange: (mode: FlowPlaybackMode) => void;
  onDebugModeToggle: () => void;
}

const FLOW_PLAYBACK_MODES: Array<{ label: string; value: FlowPlaybackMode; title: string }> = [
  { label: '先进先出', value: 'fifo', title: '按进入顺序播放' },
  { label: '按国家', value: 'country', title: '按攻击方国家分组' },
  { label: '按时间', value: 'time', title: '按事件时间排序' },
];

const TIME_PRESETS: TimePreset[] = ['1d', '2d', '7d'];
const TIME_PRESET_LABELS: Record<TimePreset, string> = {
  '1d': '1天',
  '2d': '2天',
  '7d': '7天',
};

export function AppToolbar(props: AppToolbarProps) {
  const {
    timeFilter,
    flowMode,
    flowPlaybackMode,
    debugModeEnabled,
    statusTone,
    statusLabel,
    onTimeFilterChange,
    onFlowModeChange,
    onFlowPlaybackModeChange,
    onDebugModeToggle,
  } = props;

  return (
    <div className="map-header-actions">
      <div className="map-dimension-toggle" role="group" aria-label="时间预设">
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
            {TIME_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      <div className="map-dimension-toggle" role="group" aria-label="流向播放模式">
        <button
          type="button"
          className={`map-dim-btn ${flowMode === 'allflow' ? 'active' : ''}`}
          aria-pressed={flowMode === 'allflow'}
          onClick={() => onFlowModeChange(flowMode === 'allflow' ? 'hover' : 'allflow')}
          title="显示当前日期范围内的全部流向"
        >
          全部流量
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
        <span className="map-filter-label">开始</span>
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
        <span className="map-filter-label">结束</span>
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
        {debugModeEnabled ? '调试开启' : '调试模式'}
      </button>

      <div
        className="map-brand-panel"
        role="status"
        aria-label={`信号控制台 ${statusLabel} 全球地图 实时 地图引擎 状态`}
      >
        <div className="map-brand-panel-top">
          <span className="map-brand-title">信号控制台</span>
          <span className={`map-brand-status ${statusTone}`}>
            <span className="status-dot" />
            <span className="map-brand-status-label">{statusLabel}</span>
          </span>
        </div>
        <div className="map-brand-panel-bottom">
          <span className="map-brand-banner">全球地图</span>
          <span className="map-brand-meta">实时 / 地图引擎 / 状态</span>
        </div>
      </div>
    </div>
  );
}
