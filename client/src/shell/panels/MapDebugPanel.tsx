import { useEffect, useState } from 'react';
import type { MapDebugSettings } from 'map/state/map-types';

interface MapDebugPanelProps {
  open: boolean;
  persistEnabled: boolean;
  settings: MapDebugSettings;
  onToggleOpen: () => void;
  onPersistChange: (enabled: boolean) => void;
  onReset: () => void;
  onLatestSectionHeightChange: (value: number) => void;
  onMapSettingsChange: (patch: Partial<Omit<MapDebugSettings, 'latestSectionHeight' | 'activeCountryCodes'>>) => void;
  onActiveCountryCodesChange: (value: string) => void;
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

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function CheckboxField(props: CheckboxFieldProps) {
  const { label, checked, onChange } = props;

  return (
    <label className="map-debug-switch">
      <span className="map-debug-field-label">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
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
    onActiveCountryCodesChange,
  } = props;
  const [activeCountryInput, setActiveCountryInput] = useState(settings.activeCountryCodes.join(', '));

  useEffect(() => {
    setActiveCountryInput(settings.activeCountryCodes.join(', '));
  }, [settings.activeCountryCodes]);

  return (
    <aside className={`map-debug-panel ${open ? '' : 'map-debug-panel--closed'}`}>
      <button
        type="button"
        className="map-debug-toggle"
        onClick={onToggleOpen}
      >
        {open ? '隐藏调试' : '显示调试'}
      </button>

      {open ? (
        <div className="map-debug-sheet">
          <div className="map-debug-header">
            <div className="map-debug-title-block">
              <span className="map-debug-title">地图调试</span>
              <span className="map-debug-subtitle">布局、缩放范围、威胁覆盖与 A→B 动画设置</span>
            </div>
            <button
              type="button"
              className="map-debug-reset"
              onClick={onReset}
            >
              重置
            </button>
          </div>

          <CheckboxField
            label="刷新后保留"
            checked={persistEnabled}
            onChange={onPersistChange}
          />

          <section className="map-debug-section">
            <h3>布局</h3>
            <NumberField
              label="信息流高度"
              value={settings.latestSectionHeight}
              min={100}
              max={560}
              step={10}
              onChange={onLatestSectionHeightChange}
            />
          </section>

          <section className="map-debug-section">
            <h3>地图边界</h3>
            <NumberField
              label="最小缩放"
              value={settings.minZoom}
              min={-6}
              max={settings.maxZoom}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ minZoom: value })}
            />
            <NumberField
              label="最大缩放"
              value={settings.maxZoom}
              min={settings.minZoom}
              max={10}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ maxZoom: value })}
            />
          </section>

          <section className="map-debug-section">
            <h3>威胁覆盖</h3>
            <CheckboxField
              label="威胁颜色显示"
              checked={settings.threatColorsEnabled}
              onChange={(value) => onMapSettingsChange({ threatColorsEnabled: value })}
            />
            <CheckboxField
              label="威胁外框显示"
              checked={settings.threatOutlineVisible}
              onChange={(value) => onMapSettingsChange({ threatOutlineVisible: value })}
            />
            <NumberField
              label="威胁外框线宽"
              value={settings.threatOutlineWidth}
              min={0.5}
              max={8}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ threatOutlineWidth: value })}
            />
            <label className="map-debug-field map-debug-field--stacked">
              <span className="map-debug-field-label">启用国家（两位字母国家代码，英文逗号分隔）</span>
              <input
                type="text"
                value={activeCountryInput}
                placeholder="CN, US, JP"
                onChange={(event) => {
                  setActiveCountryInput(event.target.value);
                }}
                onBlur={() => onActiveCountryCodesChange(activeCountryInput)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onActiveCountryCodesChange(activeCountryInput);
                  }
                }}
              />
            </label>
          </section>

          <section className="map-debug-section">
            <h3>阶段一</h3>
            <NumberField
              label="线条数量"
              value={settings.attackArc.bundleCount}
              min={1}
              max={12}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, bundleCount: value } })}
            />
            <NumberField
              label="弧度"
              value={settings.attackArc.curvatureRatio}
              min={0.01}
              max={0.6}
              step={0.01}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, curvatureRatio: value } })}
            />
            <NumberField
              label="线条间距"
              value={settings.attackArc.bundleSpreadRatio}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, bundleSpreadRatio: value } })}
            />
          </section>

          <section className="map-debug-section">
            <h3>阶段二</h3>
            <NumberField
              label="圆环大小"
              value={settings.attackArc.ringRadius}
              min={2}
              max={80}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, ringRadius: value } })}
            />
            <NumberField
              label="圆环数"
              value={settings.attackArc.ringCount}
              min={1}
              max={8}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, ringCount: value } })}
            />
            <NumberField
              label="环间距"
              value={settings.attackArc.ringSpacing}
              min={0}
              max={16}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, ringSpacing: value } })}
            />
            <NumberField
              label="环线宽"
              value={settings.attackArc.ringLineWidth}
              min={0.5}
              max={6}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, ringLineWidth: value } })}
            />
            <NumberField
              label="中心点半径"
              value={settings.attackArc.ringDotRadius}
              min={0}
              max={16}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, ringDotRadius: value } })}
            />
          </section>

          <section className="map-debug-section">
            <h3>阶段三</h3>
            <NumberField
              label="消失时间"
              value={settings.attackArc.fadeoutDuration}
              min={100}
              max={20000}
              step={50}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, fadeoutDuration: value } })}
            />
          </section>

          <section className="map-debug-section">
            <h3>播放调试</h3>
            <NumberField
              label="飞行时长"
              value={settings.attackArc.flightDuration}
              min={100}
              max={20000}
              step={50}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, flightDuration: value } })}
            />
            <NumberField
              label="停留时长"
              value={settings.attackArc.holdDuration}
              min={100}
              max={20000}
              step={50}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, holdDuration: value } })}
            />
            <NumberField
              label="重播延迟"
              value={settings.attackArc.replayDelayMs}
              min={1000}
              max={30000}
              step={100}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, replayDelayMs: value } })}
            />
            <NumberField
              label="并发起始数"
              value={settings.attackArc.maxConcurrentStarts}
              min={1}
              max={12}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, maxConcurrentStarts: value } })}
            />
            <NumberField
              label="bundle 间隔"
              value={settings.attackArc.bundleIntervalMs}
              min={100}
              max={20000}
              step={10}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, bundleIntervalMs: value } })}
            />
            <NumberField
              label="线宽"
              value={settings.attackArc.lineWidth}
              min={0.5}
              max={6}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, lineWidth: value } })}
            />
            <NumberField
              label="采样段数"
              value={settings.attackArc.segmentCount}
              min={12}
              max={240}
              step={1}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, segmentCount: value } })}
            />
          </section>

          <section className="map-debug-section">
            <h3>3D 缩放</h3>
            <NumberField
              label="弧线宽度缩放"
              value={settings.attackArc.arcWidthScale3d}
              min={0.25}
              max={3}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, arcWidthScale3d: value } })}
            />
            <NumberField
              label="箭头尺寸缩放"
              value={settings.attackArc.arrowSizeScale3d}
              min={0.25}
              max={3}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ attackArc: { ...settings.attackArc, arrowSizeScale3d: value } })}
            />
          </section>
        </div>
      ) : null}
    </aside>
  );
}
