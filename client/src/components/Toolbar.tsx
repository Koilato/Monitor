import type { DateRange } from '@shared/types';
import '../styles/toolbar.css';

interface ToolbarProps {
  viewMode: '2d' | '3d';
  dateRange: DateRange;
  onViewModeChange: (mode: '2d' | '3d') => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function Toolbar(props: ToolbarProps) {
  const { viewMode, dateRange, onViewModeChange, onDateRangeChange } = props;

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
    </div>
  );
}
