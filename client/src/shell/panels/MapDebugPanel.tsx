import { useEffect, useMemo, useState } from 'react';
import { getCountryCenterSource, getStaticCountryCenter } from 'map/lib/country-geometry';
import type {
  ArcLengthPreset,
  AttackArcBundleMode,
  AttackArcConfigState,
  AttackArcCurveType,
  AttackArcStagePreset,
  AttackArcVisualLevel,
  CountryCenterPoint,
  MapDebugSettings,
} from 'map/state/map-types';

interface MapDebugPanelProps {
  open: boolean;
  persistEnabled: boolean;
  settings: MapDebugSettings;
  attackArcConfigState: AttackArcConfigState;
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

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}

const ARC_LENGTH_PRESETS: ArcLengthPreset[] = ['long', 'medium', 'short'];
const ARC_STAGE_PRESETS: AttackArcStagePreset[] = ['stage1', 'stage2', 'stage3'];
const ARC_VISUAL_LEVELS: AttackArcVisualLevel[] = ['high', 'medium', 'low'];
const ARC_CURVE_TYPE_OPTIONS: Array<{ label: string; value: AttackArcCurveType }> = [
  { label: '二次贝塞尔', value: 'quadratic' },
  { label: '三次贝塞尔', value: 'cubic' },
];
const ARC_BUNDLE_MODE_OPTIONS: Array<{ label: string; value: AttackArcBundleMode }> = [
  { label: '分离路径', value: 'split-path' },
  { label: '同路径脉冲', value: 'pulse-same-path' },
];

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

function TextField(props: TextFieldProps) {
  const { label, value, placeholder, onChange, onCommit } = props;

  return (
    <label className="map-debug-field map-debug-field--stacked">
      <span className="map-debug-field-label">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onCommit?.();
          }
        }}
      />
    </label>
  );
}

function ColorField(props: ColorFieldProps) {
  const { label, value, onChange } = props;

  return (
    <label className="map-debug-field">
      <span className="map-debug-field-label">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<T extends string>(props: SelectFieldProps<T>) {
  const { label, value, options, onChange } = props;

  return (
    <label className="map-debug-field">
      <span className="map-debug-field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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

function getPresetLabel(preset: ArcLengthPreset): string {
  if (preset === 'long') {
    return '长线配置';
  }

  if (preset === 'medium') {
    return '中线配置';
  }

  return '短线配置';
}

function getStageLabel(stage: AttackArcStagePreset): string {
  if (stage === 'stage1') {
    return '阶段一（flight）';
  }

  if (stage === 'stage2') {
    return '阶段二（hold）';
  }

  return '阶段三（fadeout）';
}

function getVisualLevelLabel(level: AttackArcVisualLevel): string {
  if (level === 'high') {
    return '高危颜色';
  }

  if (level === 'medium') {
    return '中危颜色';
  }

  return '低危颜色';
}

function getSourceLabel(source: ReturnType<typeof getCountryCenterSource>): string {
  if (source === 'override') {
    return '调试覆写';
  }

  if (source === 'preset') {
    return '固化字典';
  }

  if (source === 'computed') {
    return '运行时计算';
  }

  return '未命中';
}

function formatCoordinateValue(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export function MapDebugPanel(props: MapDebugPanelProps) {
  const {
    open,
    persistEnabled,
    settings,
    attackArcConfigState,
    onToggleOpen,
    onPersistChange,
  onReset,
  onLatestSectionHeightChange,
  onMapSettingsChange,
  } = props;
  const [centerCountryCode, setCenterCountryCode] = useState('CN');
  const normalizedCenterCountryCode = centerCountryCode.trim().toUpperCase();

  const resolvedCenterPoint = useMemo(() => {
    if (!/^[A-Z]{2}$/.test(normalizedCenterCountryCode)) {
      return null;
    }

    return settings.countryCenterOverrides[normalizedCenterCountryCode]
      ?? getStaticCountryCenter(normalizedCenterCountryCode)
      ?? null;
  }, [normalizedCenterCountryCode, settings.countryCenterOverrides]);
  const [centerLonInput, setCenterLonInput] = useState(formatCoordinateValue(resolvedCenterPoint?.lon));
  const [centerLatInput, setCenterLatInput] = useState(formatCoordinateValue(resolvedCenterPoint?.lat));

  useEffect(() => {
    setCenterLonInput(formatCoordinateValue(resolvedCenterPoint?.lon));
    setCenterLatInput(formatCoordinateValue(resolvedCenterPoint?.lat));
  }, [resolvedCenterPoint]);

  const applyCenterOverride = () => {
    if (!/^[A-Z]{2}$/.test(normalizedCenterCountryCode)) {
      return;
    }

    const lon = Number(centerLonInput);
    const lat = Number(centerLatInput);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }

    onMapSettingsChange({
      countryCenterOverrides: {
        ...settings.countryCenterOverrides,
        [normalizedCenterCountryCode]: { lon, lat } satisfies CountryCenterPoint,
      },
    });
  };

  const clearCenterOverride = () => {
    if (!/^[A-Z]{2}$/.test(normalizedCenterCountryCode)) {
      return;
    }

    const nextOverrides = { ...settings.countryCenterOverrides };
    delete nextOverrides[normalizedCenterCountryCode];
    onMapSettingsChange({
      countryCenterOverrides: nextOverrides,
    });
  };

  const currentCenterSource = /^[A-Z]{2}$/.test(normalizedCenterCountryCode)
    ? getCountryCenterSource(normalizedCenterCountryCode)
    : 'missing';

  const updateAttackArcPreset = (
    preset: ArcLengthPreset,
    patch: Partial<MapDebugSettings['attackArc']['presets'][ArcLengthPreset]>,
  ) => {
    onMapSettingsChange({
      attackArc: {
        ...settings.attackArc,
        presets: {
          ...settings.attackArc.presets,
          [preset]: {
            ...settings.attackArc.presets[preset],
            ...patch,
          },
        },
      },
    });
  };

  const updateAttackArcStage = (
    preset: ArcLengthPreset,
    stage: AttackArcStagePreset,
    patch: Partial<MapDebugSettings['attackArc']['presets'][ArcLengthPreset]['stages'][AttackArcStagePreset]>,
  ) => {
    updateAttackArcPreset(preset, {
      stages: {
        ...settings.attackArc.presets[preset].stages,
        [stage]: {
          ...settings.attackArc.presets[preset].stages[stage],
          ...patch,
        },
      },
    });
  };

  const updateAttackArcVisualStyle = (
    level: AttackArcVisualLevel,
    patch: Partial<MapDebugSettings['attackArc']['visualStyles'][AttackArcVisualLevel]>,
  ) => {
    onMapSettingsChange({
      attackArc: {
        ...settings.attackArc,
        visualStyles: {
          ...settings.attackArc.visualStyles,
          [level]: {
            ...settings.attackArc.visualStyles[level],
            ...patch,
          },
        },
      },
    });
  };

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
              <span className="map-debug-subtitle">布局、底图内部边界、攻击国高亮、悬停高亮、AttackArc 样式与国家中心点</span>
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
            <div className="map-debug-subsection">
              <h4>右下统计面板</h4>
              <NumberField
                label="UI 缩放"
                value={settings.trafficStats.uiScale}
                min={0.55}
                max={1.2}
                step={0.05}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    uiScale: value,
                  },
                })}
              />
              <NumberField
                label="趋势面板宽度"
                value={settings.trafficStats.trendPanelWidth}
                min={220}
                max={720}
                step={4}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    trendPanelWidth: value,
                  },
                })}
              />
              <NumberField
                label="柱图面板宽度"
                value={settings.trafficStats.barsPanelWidth}
                min={280}
                max={1200}
                step={4}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    barsPanelWidth: value,
                  },
                })}
              />
              <NumberField
                label="右栏宽度"
                value={settings.trafficStats.originsPanelWidth}
                min={180}
                max={420}
                step={4}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    originsPanelWidth: value,
                  },
                })}
              />
              <NumberField
                label="面板横向内边距"
                value={settings.trafficStats.panelPaddingX}
                min={8}
                max={40}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    panelPaddingX: value,
                  },
                })}
              />
              <NumberField
                label="图表上内边距"
                value={settings.trafficStats.panelPaddingTop}
                min={0}
                max={32}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    panelPaddingTop: value,
                  },
                })}
              />
              <NumberField
                label="图表下内边距"
                value={settings.trafficStats.panelPaddingBottom}
                min={8}
                max={40}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    panelPaddingBottom: value,
                  },
                })}
              />
              <NumberField
                label="柱间距"
                value={settings.trafficStats.barGap}
                min={4}
                max={20}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    barGap: value,
                  },
                })}
              />
              <NumberField
                label="柱状图数量"
                value={settings.trafficStats.barCount}
                min={4}
                max={16}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    barCount: value,
                  },
                })}
              />
              <NumberField
                label="柱宽"
                value={settings.trafficStats.barWidth}
                min={12}
                max={80}
                step={1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    barWidth: value,
                  },
                })}
              />
              <NumberField
                label="国家标签字号"
                value={settings.trafficStats.countryLabelScale}
                min={0.7}
                max={1.8}
                step={0.05}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    countryLabelScale: value,
                  },
                })}
              />
              <NumberField
                label="趋势轴字号"
                value={settings.trafficStats.trendAxisLabelScale}
                min={0.7}
                max={1.8}
                step={0.05}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    trendAxisLabelScale: value,
                  },
                })}
              />
              <NumberField
                label="趋势填充透明度"
                value={settings.trafficStats.trendAreaOpacity}
                min={0.05}
                max={0.6}
                step={0.01}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    trendAreaOpacity: value,
                  },
                })}
              />
              <NumberField
                label="趋势线宽"
                value={settings.trafficStats.trendStrokeWidth}
                min={1}
                max={4}
                step={0.1}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    trendStrokeWidth: value,
                  },
                })}
              />
              <NumberField
                label="统计数字字号"
                value={settings.trafficStats.summaryValueScale}
                min={0.7}
                max={1.8}
                step={0.05}
                onChange={(value) => onMapSettingsChange({
                  trafficStats: {
                    ...settings.trafficStats,
                    summaryValueScale: value,
                  },
                })}
              />
            </div>
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
            <h3>底图样式</h3>
            <ColorField
              label="底图填充颜色"
              value={settings.baseCountryFillColor}
              onChange={(value) => onMapSettingsChange({ baseCountryFillColor: value })}
            />
            <NumberField
              label="底图填充透明度"
              value={settings.baseCountryFillOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ baseCountryFillOpacity: value })}
            />
            <ColorField
              label="底图内部边界描线颜色"
              value={settings.baseCountryOutlineColor}
              onChange={(value) => onMapSettingsChange({ baseCountryOutlineColor: value })}
            />
            <NumberField
              label="底图内部边界描线线宽"
              value={settings.baseCountryOutlineWidth}
              min={0}
              max={8}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ baseCountryOutlineWidth: value })}
            />
            <NumberField
              label="底图内部边界描线透明度"
              value={settings.baseCountryOutlineOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ baseCountryOutlineOpacity: value })}
            />
            <ColorField
              label="底图内部边界 glow 颜色"
              value={settings.baseCountryGlowColor}
              onChange={(value) => onMapSettingsChange({ baseCountryGlowColor: value })}
            />
            <NumberField
              label="底图内部边界 glow 线宽"
              value={settings.baseCountryGlowWidth}
              min={0}
              max={24}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ baseCountryGlowWidth: value })}
            />
            <NumberField
              label="底图内部边界 glow 透明度"
              value={settings.baseCountryGlowOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ baseCountryGlowOpacity: value })}
            />
          </section>

          <section className="map-debug-section">
            <h3>威胁覆盖</h3>
            <CheckboxField
              label="威胁颜色显示"
              checked={settings.threatColorsEnabled}
              onChange={(value) => onMapSettingsChange({ threatColorsEnabled: value })}
            />
            <div className="map-debug-subsection">
              <h4>威胁填充</h4>
              <NumberField
                label="威胁填充透明度"
                value={settings.threatFillOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => onMapSettingsChange({ threatFillOpacity: value })}
              />
            </div>
            <div className="map-debug-subsection">
              <h4>攻击国描边</h4>
              <CheckboxField
                label="攻击国描边显示"
                checked={settings.threatOutlineVisible}
                onChange={(value) => onMapSettingsChange({ threatOutlineVisible: value })}
              />
              <ColorField
                label="攻击国描边中性色"
                value={settings.threatOutlineNeutralColor}
                onChange={(value) => onMapSettingsChange({ threatOutlineNeutralColor: value })}
              />
              <NumberField
                label="攻击国描边线宽"
                value={settings.threatOutlineWidth}
                min={0}
                max={12}
                step={0.1}
                onChange={(value) => onMapSettingsChange({ threatOutlineWidth: value })}
              />
              <NumberField
                label="攻击国描边透明度"
                value={settings.threatOutlineOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => onMapSettingsChange({ threatOutlineOpacity: value })}
              />
            </div>
            <div className="map-debug-subsection">
              <h4>攻击国 Glow</h4>
              <ColorField
                label="攻击国 glow 中性色"
                value={settings.threatGlowNeutralColor}
                onChange={(value) => onMapSettingsChange({ threatGlowNeutralColor: value })}
              />
              <NumberField
                label="攻击国 glow 线宽"
                value={settings.threatGlowWidth}
                min={0}
                max={24}
                step={0.1}
                onChange={(value) => onMapSettingsChange({ threatGlowWidth: value })}
              />
              <NumberField
                label="攻击国 glow 透明度"
                value={settings.threatGlowOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => onMapSettingsChange({ threatGlowOpacity: value })}
              />
            </div>
            <p>图层定位：`countries-base-line` / `countries-base-glow` 控制底图内部边界，`countries-threat-line` / `countries-threat-glow` 控制攻击国外轮廓。</p>
          </section>

          <section className="map-debug-section">
            <h3>悬停高亮</h3>
            <ColorField
              label="悬停填充颜色"
              value={settings.hoverFillColor}
              onChange={(value) => onMapSettingsChange({ hoverFillColor: value })}
            />
            <NumberField
              label="悬停填充透明度"
              value={settings.hoverFillOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverFillOpacity: value })}
            />
            <NumberField
              label="威胁悬停填充透明度"
              value={settings.hoverThreatFillOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverThreatFillOpacity: value })}
            />
            <ColorField
              label="悬停发光颜色"
              value={settings.hoverGlowColor}
              onChange={(value) => onMapSettingsChange({ hoverGlowColor: value })}
            />
            <NumberField
              label="悬停发光线宽"
              value={settings.hoverGlowWidth}
              min={0}
              max={24}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ hoverGlowWidth: value })}
            />
            <NumberField
              label="悬停发光透明度"
              value={settings.hoverGlowOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverGlowOpacity: value })}
            />
            <NumberField
              label="威胁悬停发光透明度"
              value={settings.hoverThreatGlowOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverThreatGlowOpacity: value })}
            />
            <ColorField
              label="悬停描边颜色"
              value={settings.hoverBorderColor}
              onChange={(value) => onMapSettingsChange({ hoverBorderColor: value })}
            />
            <NumberField
              label="悬停描边线宽"
              value={settings.hoverBorderWidth}
              min={0}
              max={24}
              step={0.1}
              onChange={(value) => onMapSettingsChange({ hoverBorderWidth: value })}
            />
            <NumberField
              label="悬停描边透明度"
              value={settings.hoverBorderOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverBorderOpacity: value })}
            />
            <NumberField
              label="威胁悬停描边透明度"
              value={settings.hoverThreatBorderOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onMapSettingsChange({ hoverThreatBorderOpacity: value })}
            />
          </section>

          <section className="map-debug-section">
            <h3>长度分档</h3>
            <NumberField
              label="短线最大距离"
              value={settings.attackArc.lengthThresholds.shortMax}
              min={1}
              max={settings.attackArc.lengthThresholds.mediumMax}
              step={1}
              onChange={(value) => onMapSettingsChange({
                attackArc: {
                  ...settings.attackArc,
                  lengthThresholds: {
                    ...settings.attackArc.lengthThresholds,
                    shortMax: value,
                  },
                },
              })}
            />
            <NumberField
              label="中线最大距离"
              value={settings.attackArc.lengthThresholds.mediumMax}
              min={settings.attackArc.lengthThresholds.shortMax}
              max={360}
              step={1}
              onChange={(value) => onMapSettingsChange({
                attackArc: {
                  ...settings.attackArc,
                  lengthThresholds: {
                    ...settings.attackArc.lengthThresholds,
                    mediumMax: value,
                  },
                },
              })}
            />
          </section>

          {!attackArcConfigState.isValid && attackArcConfigState.errorMessage ? (
            <section className="map-debug-section">
              <h3>AttackArc 状态</h3>
              <p className="map-debug-error">{attackArcConfigState.errorMessage}</p>
            </section>
          ) : null}

          <section className="map-debug-section">
            <h3>威胁颜色分档</h3>
            {ARC_VISUAL_LEVELS.map((level) => (
              <div className="map-debug-subsection" key={level}>
                <h4>{getVisualLevelLabel(level)}</h4>
                <ColorField
                  label="主线颜色"
                  value={settings.attackArc.visualStyles[level].lineColor}
                  onChange={(value) => updateAttackArcVisualStyle(level, { lineColor: value })}
                />
                <ColorField
                  label="圆环颜色"
                  value={settings.attackArc.visualStyles[level].ringColor}
                  onChange={(value) => updateAttackArcVisualStyle(level, { ringColor: value })}
                />
                <ColorField
                  label="中心点颜色"
                  value={settings.attackArc.visualStyles[level].dotColor}
                  onChange={(value) => updateAttackArcVisualStyle(level, { dotColor: value })}
                />
              </div>
            ))}
          </section>

          {ARC_LENGTH_PRESETS.map((preset) => (
            <section className="map-debug-section" key={preset}>
              <h3>{getPresetLabel(preset)}</h3>
              <div className="map-debug-subsection">
                <h4>公共弧线参数</h4>
                <NumberField
                  label="线束展开"
                  value={settings.attackArc.presets[preset].bundleSpreadRatio}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  onChange={(value) => updateAttackArcPreset(preset, { bundleSpreadRatio: value })}
                />
                <NumberField
                  label="弧线比例"
                  value={settings.attackArc.presets[preset].curvatureRatio}
                  min={0.01}
                  max={0.6}
                  step={0.01}
                  onChange={(value) => updateAttackArcPreset(preset, { curvatureRatio: value })}
                />
                <NumberField
                  label="线宽"
                  value={settings.attackArc.presets[preset].lineWidth}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(value) => updateAttackArcPreset(preset, { lineWidth: value })}
                />
                <NumberField
                  label="采样段数"
                  value={settings.attackArc.presets[preset].segmentCount}
                  min={12}
                  max={240}
                  step={1}
                  onChange={(value) => updateAttackArcPreset(preset, { segmentCount: value })}
                />
              </div>
              <div className="map-debug-subsection">
                <h4>路径模型</h4>
                <SelectField
                  label="曲线类型"
                  value={settings.attackArc.presets[preset].curveType}
                  options={ARC_CURVE_TYPE_OPTIONS}
                  onChange={(value) => updateAttackArcPreset(preset, { curveType: value })}
                />
                <NumberField
                  label="路径采样点"
                  value={settings.attackArc.presets[preset].pathSamplingCount}
                  min={12}
                  max={360}
                  step={1}
                  onChange={(value) => updateAttackArcPreset(preset, { pathSamplingCount: value })}
                />
                <NumberField
                  label="最小弧高 px"
                  value={settings.attackArc.presets[preset].minArcHeightPx}
                  min={0}
                  max={500}
                  step={1}
                  onChange={(value) => updateAttackArcPreset(preset, { minArcHeightPx: value })}
                />
                <NumberField
                  label="最大弧高 px"
                  value={settings.attackArc.presets[preset].maxArcHeightPx}
                  min={0}
                  max={500}
                  step={1}
                  onChange={(value) => updateAttackArcPreset(preset, { maxArcHeightPx: value })}
                />
                <NumberField
                  label="屏幕弧高比例"
                  value={settings.attackArc.presets[preset].arcHeightRatio}
                  min={0}
                  max={0.8}
                  step={0.01}
                  onChange={(value) => updateAttackArcPreset(preset, { arcHeightRatio: value })}
                />
                <NumberField
                  label="三次控制内收"
                  value={settings.attackArc.presets[preset].controlInsetRatio}
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  onChange={(value) => updateAttackArcPreset(preset, { controlInsetRatio: value })}
                />
                <CheckboxField
                  label="按真实弧长推进"
                  checked={settings.attackArc.presets[preset].lengthBasedProgress}
                  onChange={(value) => updateAttackArcPreset(preset, { lengthBasedProgress: value })}
                />
              </div>
              <div className="map-debug-subsection">
                <h4>线束行为</h4>
                <SelectField
                  label="线束模式"
                  value={settings.attackArc.presets[preset].bundleMode}
                  options={ARC_BUNDLE_MODE_OPTIONS}
                  onChange={(value) => updateAttackArcPreset(preset, { bundleMode: value })}
                />
                <NumberField
                  label="线束弧高步进 px"
                  value={settings.attackArc.presets[preset].bundleHeightStepPx}
                  min={-80}
                  max={80}
                  step={1}
                  onChange={(value) => updateAttackArcPreset(preset, { bundleHeightStepPx: value })}
                />
                <NumberField
                  label="线束透明衰减"
                  value={settings.attackArc.presets[preset].bundleAlphaStep}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => updateAttackArcPreset(preset, { bundleAlphaStep: value })}
                />
                <CheckboxField
                  label="同组终点环去重"
                  checked={settings.attackArc.presets[preset].dedupeTargetRings}
                  onChange={(value) => updateAttackArcPreset(preset, { dedupeTargetRings: value })}
                />
              </div>
              <NumberField
                label="线条数量"
                value={settings.attackArc.presets[preset].bundleCount}
                min={1}
                max={12}
                step={1}
                onChange={(value) => updateAttackArcPreset(preset, { bundleCount: value })}
              />
              <NumberField
                label="飞行时长"
                value={settings.attackArc.presets[preset].flightDuration}
                min={100}
                max={20000}
                step={50}
                onChange={(value) => updateAttackArcPreset(preset, { flightDuration: value })}
              />
              <NumberField
                label="停留时长"
                value={settings.attackArc.presets[preset].holdDuration}
                min={100}
                max={20000}
                step={50}
                onChange={(value) => updateAttackArcPreset(preset, { holdDuration: value })}
              />
              <NumberField
                label="消失时间"
                value={settings.attackArc.presets[preset].fadeoutDuration}
                min={100}
                max={20000}
                step={50}
                onChange={(value) => updateAttackArcPreset(preset, { fadeoutDuration: value })}
              />
              <NumberField
                label="重播延迟"
                value={settings.attackArc.presets[preset].replayDelayMs}
                min={1000}
                max={30000}
                step={100}
                onChange={(value) => updateAttackArcPreset(preset, { replayDelayMs: value })}
              />
              <NumberField
                label="并发起始数"
                value={settings.attackArc.presets[preset].maxConcurrentStarts}
                min={1}
                max={12}
                step={1}
                onChange={(value) => updateAttackArcPreset(preset, { maxConcurrentStarts: value })}
              />
              <NumberField
                label="bundle 间隔"
                value={settings.attackArc.presets[preset].bundleIntervalMs}
                min={100}
                max={20000}
                step={10}
                onChange={(value) => updateAttackArcPreset(preset, { bundleIntervalMs: value })}
              />

              {ARC_STAGE_PRESETS.map((stage) => (
                <div className="map-debug-subsection" key={`${preset}-${stage}`}>
                  <h4>{getStageLabel(stage)}</h4>
                  <NumberField
                    label="主线透明度"
                    value={settings.attackArc.presets[preset].stages[stage].lineAlpha}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => updateAttackArcStage(preset, stage, { lineAlpha: value })}
                  />
                  <NumberField
                    label="圆环透明度"
                    value={settings.attackArc.presets[preset].stages[stage].ringAlpha}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringAlpha: value })}
                  />
                  <NumberField
                    label="中心点透明度"
                    value={settings.attackArc.presets[preset].stages[stage].dotAlpha}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => updateAttackArcStage(preset, stage, { dotAlpha: value })}
                  />
                  <NumberField
                    label="圆环大小"
                    value={settings.attackArc.presets[preset].stages[stage].ringRadius}
                    min={2}
                    max={80}
                    step={1}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringRadius: value })}
                  />
                  <NumberField
                    label="圆环数"
                    value={settings.attackArc.presets[preset].stages[stage].ringCount}
                    min={1}
                    max={8}
                    step={1}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringCount: value })}
                  />
                  <NumberField
                    label="环间距"
                    value={settings.attackArc.presets[preset].stages[stage].ringSpacing}
                    min={0}
                    max={16}
                    step={1}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringSpacing: value })}
                  />
                  <NumberField
                    label="环线宽"
                    value={settings.attackArc.presets[preset].stages[stage].ringLineWidth}
                    min={0.5}
                    max={6}
                    step={0.1}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringLineWidth: value })}
                  />
                  <NumberField
                    label="中心点半径"
                    value={settings.attackArc.presets[preset].stages[stage].ringDotRadius}
                    min={0}
                    max={16}
                    step={1}
                    onChange={(value) => updateAttackArcStage(preset, stage, { ringDotRadius: value })}
                  />
                </div>
              ))}
            </section>
          ))}

          <section className="map-debug-section">
            <h3>国家中心点</h3>
            <TextField
              label="国家代码"
              value={centerCountryCode}
              placeholder="CN"
              onChange={setCenterCountryCode}
            />
            <p>当前来源：{getSourceLabel(currentCenterSource)}</p>
            <TextField
              label="经度"
              value={centerLonInput}
              placeholder="109.505273"
              onChange={setCenterLonInput}
              onCommit={applyCenterOverride}
            />
            <TextField
              label="纬度"
              value={centerLatInput}
              placeholder="32.434741"
              onChange={setCenterLatInput}
              onCommit={applyCenterOverride}
            />
            <div className="map-debug-actions">
              <button type="button" className="map-debug-reset" onClick={applyCenterOverride}>应用覆写</button>
              <button type="button" className="map-debug-reset" onClick={clearCenterOverride}>清除覆写</button>
            </div>
          </section>

        </div>
      ) : null}
    </aside>
  );
}
