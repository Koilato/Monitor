import type { AllFlowResponse, RansomwareKpiResponse, ThreatMapResponse, ThreatTrendResponse } from '@shared/types';
import type { RefObject } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { TrafficStatsDebugSettings } from 'map/state/map-types';
import {
  buildTrafficStats,
  summarizeThreatFrequency,
  type TrafficStatItem,
  type TrafficStatTone,
} from 'shell/lib/traffic-stats';

interface TrafficStatsSectionProps {
  sectionRef: RefObject<HTMLElement | null>;
  data: AllFlowResponse | null;
  threatData: ThreatMapResponse | null;
  threatLoading: boolean;
  threatError: string | null;
  trendData: ThreatTrendResponse | null;
  trendLoading: boolean;
  trendError: string | null;
  ransomwareKpis: RansomwareKpiResponse | null;
  ransomwareKpisLoading: boolean;
  ransomwareKpisError: string | null;
  loading: boolean;
  error: string | null;
  settings: TrafficStatsDebugSettings;
}

const TONE_COLOR_MAP: Record<TrafficStatTone, string> = {
  critical: '#ff4d4d',
  warning: '#f2b94b',
  info: '#14b8a6',
  neutral: 'rgba(185,198,204,0.16)',
};

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRansomAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTick(value: string): string {
  return value.slice(5);
}

function formatKpiValue(value: number | null | undefined, loading: boolean, error: string | null): string {
  if (error) {
    return '错误';
  }
  if (loading || value == null) {
    return loading ? '...' : '--';
  }
  return formatRansomAmount(value);
}

interface SvgPoint {
  x: number;
  y: number;
}

interface ThreatDonutSegment {
  key: 'high' | 'medium' | 'low';
  label: string;
  value: number;
  share: number;
  colorVar: string;
  className: string;
  path: string;
  calloutPath: string;
  textAnchor: 'start' | 'end';
  labelX: number;
  percentY: number;
  nameY: number;
  countY: number;
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="traffic-economic-icon">
      <path
        d="M2.5 11.5h11M3.5 10l3.4-3.4 2.2 2.2L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 5H13v2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="traffic-economic-icon">
      <path
        d="M2.5 8h2.4l1.4-3.2 2.2 6 1.6-3 1 2.2H13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BarChart3Icon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="traffic-economic-icon">
      <path d="M3 3.5v9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 12.5h10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="5" y="8.5" width="1.8" height="4" rx="0.8" fill="currentColor" />
      <rect x="8.1" y="6.2" width="1.8" height="6.3" rx="0.8" fill="currentColor" opacity="0.8" />
      <rect x="11.2" y="4.4" width="1.8" height="8.1" rx="0.8" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function resolveTickFontSize(uiScale: number, scale = 1): number {
  return Math.max(8, Math.min(13, Math.round(10 * uiScale * scale)));
}

function resolveYAxisWidth(maxValue: number, fontSize: number): number {
  const safeValue = Math.max(0, Math.floor(maxValue));
  const digits = String(safeValue).length;
  return Math.max(26, Math.ceil(digits * fontSize * 0.72 + 14));
}

function resolveCountryLabel(item: TrafficStatItem): string {
  return item.countryName ?? item.countryCode;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): SvgPoint {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const sweepDeg = endDeg - startDeg;
  const largeArcFlag = sweepDeg > 180 ? 1 : 0;

  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function buildThreatDonutSegments(
  totals: ReturnType<typeof summarizeThreatFrequency>,
): ThreatDonutSegment[] {
  const total = totals.high + totals.medium + totals.low;
  if (total <= 0) {
    return [];
  }

  const cx = 100;
  const cy = 88;
  const radius = 58;
  const calloutStartRadius = radius + 5;
  const calloutBendRadius = radius + 24;
  const labelGap = 7;
  const horizontalLength = 34;
  const startAngle = -70;
  const items = [
    {
      key: 'high' as const,
      label: '高危',
      value: totals.high,
      share: totals.high / total,
      colorVar: 'var(--threat-high)',
      className: 'threat-donut-segment--high',
    },
    {
      key: 'medium' as const,
      label: '中危',
      value: totals.medium,
      share: totals.medium / total,
      colorVar: 'var(--threat-medium)',
      className: 'threat-donut-segment--medium',
    },
    {
      key: 'low' as const,
      label: '低危',
      value: totals.low,
      share: totals.low / total,
      colorVar: 'var(--threat-low)',
      className: 'threat-donut-segment--low',
    },
  ];

  let currentAngle = startAngle;

  return items.map((item, index) => {
    const sweepDeg = index === items.length - 1 ? 360 - (currentAngle - startAngle) : item.share * 360;
    const startDeg = currentAngle;
    const endDeg = startDeg + sweepDeg;
    const midDeg = startDeg + sweepDeg / 2;
    const calloutStart = polarToCartesian(cx, cy, calloutStartRadius, midDeg);
    const calloutBend = polarToCartesian(cx, cy, calloutBendRadius, midDeg);
    const isRightSide = calloutBend.x >= cx;
    const calloutEnd = {
      x: calloutBend.x + (isRightSide ? horizontalLength : -horizontalLength),
      y: calloutBend.y,
    };
    const labelX = calloutEnd.x + (isRightSide ? labelGap : -labelGap);
    const percentY = calloutEnd.y - 6;

    currentAngle = endDeg;

    return {
      ...item,
      path: describeArc(cx, cy, radius, startDeg, endDeg),
      calloutPath: `M ${calloutStart.x.toFixed(3)} ${calloutStart.y.toFixed(3)} L ${calloutBend.x.toFixed(3)} ${calloutBend.y.toFixed(3)} L ${calloutEnd.x.toFixed(3)} ${calloutEnd.y.toFixed(3)}`,
      textAnchor: isRightSide ? 'start' : 'end',
      labelX,
      percentY,
      nameY: percentY + 18,
      countY: percentY + 32,
    };
  });
}

function renderThreatTrend(
  settings: TrafficStatsDebugSettings,
  data: ThreatTrendResponse | null,
  isLoading: boolean,
  error: string | null,
) {
  const days = data?.days ?? [];
  const axisFontSize = resolveTickFontSize(settings.uiScale, settings.trendAxisLabelScale);
  const yAxisWidth = resolveYAxisWidth(
    Math.max(0, ...days.map((item) => Math.max(item.high, item.medium, item.low))),
    axisFontSize,
  );

  return (
    <div className="traffic-stats-panel traffic-stats-panel--trend" aria-label="7天威胁趋势">
      <header className="traffic-panel-header traffic-panel-header--compact">
        <div className="threat-trend-copy">
          <span className="threat-trend-kicker">Threat Trend</span>
          <h2 className="traffic-panel-title traffic-panel-title--compact">7天威胁频次</h2>
        </div>
        <div className="threat-trend-legend" aria-hidden="true">
          <span className="threat-trend-legend-item">
            <span className="threat-trend-legend-dot threat-trend-legend-dot--high" />
            高
          </span>
          <span className="threat-trend-legend-item">
            <span className="threat-trend-legend-dot threat-trend-legend-dot--medium" />
            中
          </span>
          <span className="threat-trend-legend-item">
            <span className="threat-trend-legend-dot threat-trend-legend-dot--low" />
            低
          </span>
        </div>
      </header>

      <div className="traffic-panel-body traffic-panel-body--trend">
        {isLoading ? (
          <div className="traffic-panel-empty">正在汇总当前时间范围的趋势数据...</div>
        ) : error ? (
          <div className="traffic-panel-empty traffic-panel-empty--error">{error}</div>
        ) : days.length > 0 ? (
          <div className="threat-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ top: 10, right: 4, left: 0, bottom: 2 }}>
                <CartesianGrid vertical={false} stroke="rgba(159,179,190,0.1)" strokeDasharray="2 6" />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={yAxisWidth}
                  tickMargin={8}
                  tick={{ fill: 'rgba(255,255,255,0.34)', fontSize: axisFontSize, fontWeight: 700 }}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateTick}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                  tickMargin={4}
                  tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: axisFontSize, fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="var(--threat-high)"
                  fill="var(--threat-high)"
                  fillOpacity={Math.min(settings.trendAreaOpacity, 0.18)}
                  strokeWidth={settings.trendStrokeWidth}
                  dot={false}
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stroke="var(--threat-medium)"
                  fill="var(--threat-medium)"
                  fillOpacity={Math.min(settings.trendAreaOpacity, 0.18)}
                  strokeWidth={settings.trendStrokeWidth}
                  dot={false}
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stroke="var(--threat-low)"
                  fill="var(--threat-low)"
                  fillOpacity={Math.min(settings.trendAreaOpacity, 0.18)}
                  strokeWidth={settings.trendStrokeWidth}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="traffic-panel-empty">当前时间范围内没有可展示的趋势数据。</div>
        )}
      </div>
    </div>
  );
}

function renderTrafficVolumePanel(
  items: TrafficStatItem[],
  settings: TrafficStatsDebugSettings,
  isLoading: boolean,
  error: string | null,
  hasData: boolean,
  totalVolume: number,
) {
  const axisFontSize = resolveTickFontSize(settings.uiScale, settings.countryLabelScale);
  const yAxisFontSize = resolveTickFontSize(settings.uiScale);
  const yAxisWidth = resolveYAxisWidth(items[0]?.volume ?? 0, yAxisFontSize);
  const countryLabelByCode = new Map(items.map((item) => [item.countryCode, resolveCountryLabel(item)]));

  return (
    <div className="traffic-stats-panel traffic-stats-panel--bars" aria-label="来源国家流量柱状图">
      <header className="traffic-panel-header traffic-panel-header--compact">
        <div className="traffic-panel-header-copy">
          <span className="traffic-panel-kicker">Traffic Volume</span>
          <h2 className="traffic-panel-title traffic-panel-title--compact">来源国家流量</h2>
        </div>
      </header>

      <div className="traffic-panel-body traffic-panel-body--bars">
        {isLoading ? (
          <div className="traffic-panel-empty">正在汇总当前时间范围的流量数据...</div>
        ) : error ? (
          <div className="traffic-panel-empty traffic-panel-empty--error">{error}</div>
        ) : hasData ? (
          <>
            <div className="traffic-chart-meta">
              <span className="traffic-chart-total">总流量 {formatVolume(totalVolume)}</span>
              <span className="traffic-chart-subtitle">按来源国家聚合 / Top {items.length}</span>
            </div>
            <div className="traffic-volume-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items} margin={{ top: 8, right: 2, left: 0, bottom: 2 }} barCategoryGap={settings.barGap}>
                  <CartesianGrid vertical={false} stroke="rgba(159,179,190,0.1)" strokeDasharray="2 6" />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={yAxisWidth}
                    tickMargin={8}
                    tick={{ fill: 'rgba(255,255,255,0.34)', fontSize: yAxisFontSize, fontWeight: 700 }}
                  />
                  <XAxis
                    dataKey="countryCode"
                    tickFormatter={(value) => countryLabelByCode.get(String(value)) ?? String(value)}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={6}
                    tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: axisFontSize, fontWeight: 800 }}
                  />
                  <Bar dataKey="volume" radius={[0, 0, 0, 0]} barSize={settings.barWidth}>
                    {items.map((item) => (
                      <Cell key={item.countryCode} fill={TONE_COLOR_MAP[item.tone]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="traffic-panel-empty">当前时间范围内没有可展示的来源流量。</div>
        )}
      </div>
    </div>
  );
}

function renderThreatSummary(
  threatData: ThreatMapResponse | null,
  isLoading: boolean,
  error: string | null,
) {
  const totals = summarizeThreatFrequency(threatData);
  const summaryItems = buildThreatDonutSegments(totals);

  return (
    <div className="traffic-stats-panel traffic-stats-panel--summary" aria-label="威胁统计">
      <header className="traffic-panel-header traffic-panel-header--compact">
        <div className="traffic-panel-header-copy">
          <span className="traffic-panel-kicker">Threat Summary</span>
          <h2 className="traffic-panel-title traffic-panel-title--compact">威胁统计</h2>
        </div>
      </header>

      <div className="traffic-panel-body traffic-panel-body--summary">
        {isLoading ? (
          <div className="traffic-panel-empty">正在汇总当前时间范围的威胁统计...</div>
        ) : error ? (
          <div className="traffic-panel-empty traffic-panel-empty--error">{error}</div>
        ) : summaryItems.length > 0 ? (
          <div className="threat-donut-wrap">
          <svg className="threat-donut-chart" viewBox="0 0 236 170" role="img" aria-label="高危、中危、低危威胁占比">
            <circle className="threat-donut-track" cx="100" cy="88" r="58" />
            {summaryItems.map((item) => (
              <path
                key={item.key}
                className={`threat-donut-segment ${item.className}`}
                d={item.path}
                stroke={item.colorVar}
              />
            ))}
            {summaryItems.map((item) => (
              <path
                key={`${item.key}-callout`}
                className="threat-donut-callout"
                d={item.calloutPath}
                stroke={item.colorVar}
              />
            ))}
            {summaryItems.map((item) => (
              <g key={`${item.key}-label`} className="threat-donut-svg-label" textAnchor={item.textAnchor}>
                <text className="threat-donut-svg-percent" x={item.labelX} y={item.percentY}>{formatPercent(item.share)}</text>
                <text className="threat-donut-svg-name" x={item.labelX} y={item.nameY}>{item.label}</text>
                <text className="threat-donut-svg-count" x={item.labelX} y={item.countY}>{formatCount(item.value)} 次</text>
              </g>
            ))}
          </svg>
          </div>
        ) : (
          <div className="traffic-panel-empty">当前时间范围内没有可展示的威胁统计。</div>
        )}
      </div>
    </div>
  );
}

function renderEconomicKpisPanel(
  data: RansomwareKpiResponse | null,
  isLoading: boolean,
  error: string | null,
) {
  return (
    <div className="traffic-stats-panel traffic-stats-panel--economic" aria-label="赎金经济指标">
      <div className="traffic-economic-card traffic-economic-card--max">
        <div className="traffic-economic-card__kicker">
          <TrendUpIcon />
          <span>最高赎金支出</span>
        </div>
        <div className="traffic-economic-card__value-row">
          <div className="traffic-economic-card__value-group">
            <span className="traffic-economic-card__value traffic-economic-card__value--max">
              ￥{formatKpiValue(data?.max, isLoading, error)}
            </span>
          </div>
          <div className="traffic-economic-card__bar traffic-economic-card__bar--max" />
        </div>
      </div>

      <div className="traffic-economic-card traffic-economic-card--avg">
        <div className="traffic-economic-card__kicker">
          <ActivityIcon />
          <span>平均赎金支出</span>
        </div>
        <div className="traffic-economic-card__value-row">
          <div className="traffic-economic-card__value-group">
            <span className="traffic-economic-card__value traffic-economic-card__value--avg">
              ￥{formatKpiValue(data?.avg, isLoading, error)}
            </span>
          </div>
          <div className="traffic-economic-card__bar traffic-economic-card__bar--avg" />
        </div>
      </div>

      <div className="traffic-economic-card traffic-economic-card--median">
        <div className="traffic-economic-card__kicker">
          <BarChart3Icon />
          <span>中位金额请求</span>
        </div>
        <div className="traffic-economic-card__value-row">
          <div className="traffic-economic-card__value-group">
            <span className="traffic-economic-card__value traffic-economic-card__value--median">
              ￥{formatKpiValue(data?.median, isLoading, error)}
            </span>
          </div>
          <div className="traffic-economic-card__bar traffic-economic-card__bar--median" />
        </div>
      </div>
    </div>
  );
}

export function TrafficStatsSection(props: TrafficStatsSectionProps) {
  const {
    sectionRef,
    data,
    threatData,
    threatLoading,
    threatError,
    trendData,
    trendLoading,
    trendError,
    ransomwareKpis,
    ransomwareKpisLoading,
    ransomwareKpisError,
    loading,
    error,
    settings,
  } = props;
  const summary = buildTrafficStats(data, {
    barLimit: settings.barCount,
    listLimit: settings.originCount,
  });
  const hasData = summary.bars.length > 0;
  const isLoading = loading || (!data && !error);

  return (
    <section
      className="traffic-stats-section"
      ref={sectionRef}
      style={{
        ['--traffic-ui-scale' as string]: String(settings.uiScale),
        ['--traffic-trend-width' as string]: `${settings.trendPanelWidth}px`,
        ['--traffic-bars-width' as string]: `${settings.barsPanelWidth}px`,
        ['--traffic-summary-width' as string]: `${settings.originsPanelWidth}px`,
        ['--traffic-economic-width' as string]: '260px',
        ['--traffic-panel-padding-x' as string]: `${settings.panelPaddingX}px`,
        ['--traffic-panel-padding-top' as string]: `${settings.panelPaddingTop}px`,
        ['--traffic-panel-padding-bottom' as string]: `${settings.panelPaddingBottom}px`,
        ['--traffic-summary-value-scale' as string]: String(settings.summaryValueScale),
      }}
    >
      {renderThreatTrend(settings, trendData, trendLoading, trendError)}
      {renderTrafficVolumePanel(summary.bars, settings, isLoading, error, hasData, summary.totalVolume)}
      {renderThreatSummary(threatData, threatLoading, threatError)}
      {renderEconomicKpisPanel(ransomwareKpis, ransomwareKpisLoading, ransomwareKpisError)}
    </section>
  );
}
