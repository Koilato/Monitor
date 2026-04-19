import type { MapDebugSettings } from '../lib/types';
import '../styles/map-debug.css';

interface MapDebugPanelProps {
  open: boolean;
  persistEnabled: boolean;
  settings: MapDebugSettings;
  onToggleOpen: () => void;
  onPersistChange: (enabled: boolean) => void;
  onReset: () => void;
  onLatestSectionHeightChange: (value: number) => void;
  onTwoDChange: (patch: Partial<MapDebugSettings['twoD']>) => void;
  onThreeDChange: (patch: Partial<MapDebugSettings['threeD']>) => void;
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
    onTwoDChange,
    onThreeDChange,
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
              <span className="map-debug-subtitle">Live tuning for layout and camera</span>
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
              max={420}
              step={10}
              onChange={onLatestSectionHeightChange}
            />
          </section>

          <section className="map-debug-section">
            <h3>2D Map</h3>
            <NumberField
              label="Extra pad X px"
              value={settings.twoD.contentPaddingX}
              min={0}
              step={1}
              onChange={(value) => onTwoDChange({ contentPaddingX: value })}
            />
            <NumberField
              label="Center lng"
              value={settings.twoD.centerLng}
              min={-180}
              max={180}
              step={0.1}
              onChange={(value) => onTwoDChange({ centerLng: value })}
            />
            <NumberField
              label="Center lat"
              value={settings.twoD.centerLat}
              min={-90}
              max={90}
              step={0.1}
              onChange={(value) => onTwoDChange({ centerLat: value })}
            />
            <NumberField
              label="Zoom"
              value={settings.twoD.zoom}
              min={-8}
              max={8}
              step={0.05}
              onChange={(value) => onTwoDChange({ zoom: value })}
            />
            <NumberField
              label="Max zoom"
              value={settings.twoD.maxZoom}
              min={0.5}
              max={10}
              step={0.05}
              onChange={(value) => onTwoDChange({ maxZoom: value })}
            />
          </section>

          <section className="map-debug-section">
            <h3>3D Globe</h3>
            <NumberField
              label="POV lng"
              value={settings.threeD.povLng}
              min={-180}
              max={180}
              step={0.1}
              onChange={(value) => onThreeDChange({ povLng: value })}
            />
            <NumberField
              label="POV lat"
              value={settings.threeD.povLat}
              min={-90}
              max={90}
              step={0.1}
              onChange={(value) => onThreeDChange({ povLat: value })}
            />
            <NumberField
              label="Altitude"
              value={settings.threeD.povAltitude}
              min={0.5}
              max={6}
              step={0.05}
              onChange={(value) => onThreeDChange({ povAltitude: value })}
            />
          </section>
        </div>
      ) : null}
    </aside>
  );
}
