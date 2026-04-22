import type { MapDebugSettings } from 'map/state/map-types';
import 'shell/styles/debug-panel.css';

interface MapDebugPanelProps {
  open: boolean;
  persistEnabled: boolean;
  settings: MapDebugSettings;
  onToggleOpen: () => void;
  onPersistChange: (enabled: boolean) => void;
  onReset: () => void;
  onLatestSectionHeightChange: (value: number) => void;
  onMapSettingsChange: (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight'>>) => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

function parseNumber(value: string): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function NumberField(props: NumberFieldProps) {
  const { label, value, step = 1, min, max, onChange } = props;

  return (
    <label className="map-debug-field">
      <span className="map-debug-field-label">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(event) => onChange(parseNumber(event.target.value))}
      />
    </label>
  );
}

export function MapDebugPanel(props: MapDebugPanelProps) {
  const {
    open,
    persistEnabled,
    settings,
    onToggleOpen,
    onPersistChange,
    onReset,
    onLatestSectionHeightChange,
    onMapSettingsChange,
  } = props;

  return (
    <aside className={`map-debug-panel ${open ? 'map-debug-panel--open' : 'map-debug-panel--closed'}`}>
      <button
        type="button"
        className="map-debug-toggle"
        onClick={onToggleOpen}
      >
        {open ? 'Hide Debug' : 'Show Debug'}
      </button>

      {open ? (
        <div className="map-debug-sheet">
          <div className="map-debug-header">
            <div className="map-debug-title-block">
              <span className="map-debug-title">Map Debug</span>
              <span className="map-debug-subtitle">Layout and zoom bounds only</span>
            </div>
            <button
              type="button"
              className="map-debug-reset"
              onClick={onReset}
            >
              Reset
            </button>
          </div>

          <label className="map-debug-switch">
            <span className="map-debug-field-label">Persist on refresh</span>
            <input
              type="checkbox"
              checked={persistEnabled}
              onChange={(event) => onPersistChange(event.target.checked)}
            />
          </label>

          <section className="map-debug-section">
            <h3>Layout</h3>
            <NumberField
              label="Feed height"
              value={settings.latestSectionHeight}
              min={100}
              max={560}
              step={10}
              onChange={onLatestSectionHeightChange}
            />
          </section>

          <section className="map-debug-section">
            <h3>Map Bounds</h3>
            <NumberField
              label="Min zoom"
              value={settings.minZoom}
              min={-6}
              max={settings.maxZoom}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ minZoom: value })}
            />
            <NumberField
              label="Max zoom"
              value={settings.maxZoom}
              min={settings.minZoom}
              max={10}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ maxZoom: value })}
            />
          </section>
        </div>
      ) : null}
    </aside>
  );
}
