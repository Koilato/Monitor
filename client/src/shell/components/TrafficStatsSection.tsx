import type { AllFlowResponse } from '@shared/types';
import type { RefObject } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { TrafficStatsDebugSettings } from 'map/state/map-types';
import {
  buildTrafficStats,
  summarizeThreatFrequency,
  type ThreatTrendDatum,
  type TrafficStatItem,
  type TrafficStatTone,
} from 'shell/lib/traffic-stats';

interface TrafficStatsSectionProps {
  sectionRef: RefObject<HTMLElement | null>;
  data: AllFlowResponse | null;
  loading: boolean;
  error: string | null;
  settings: TrafficStatsDebugSettings;
}

const TONE_COLOR_MAP: Record<TrafficStatTone, string> = {
  critical: '#ff4d4d',
  warning: '#ffa500',
  info: '#ffd700',
  neutral: 'rgba(255,255,255,0.06)',
};

const THREAT_TREND_DATA: ThreatTrendDatum[] = [
  { date: '04-21', high: 16, medium: 10, low: 7 },
  { date: '04-22', high: 13, medium: 12, low: 11 },
  { date: '04-23', high: 18, medium: 14, low: 9 },
  { date: '04-24', high: 11, medium: 16, low: 12 },
  { date: '04-25', high: 19, medium: 13, low: 15 },
  { date: '04-26', high: 9, medium: 11, low: 8 },
  { date: '04-27', high: 15, medium: 9, low: 10 },
];

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
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

function resolveTickFontSize(uiScale: number, scale = 1): number {
  return Math.max(8, Math.min(13, Math.round(10 * uiScale * scale)));
}

function resolveYAxisWidth(maxValue: number, fontSize: number): number {
  const safeValue = Math.max(0, Math.floor(maxValue));
  const digits = String(safeValue).length;
  return Math.max(26, Math.ceil(digits * fontSize * 0.72 + 14));
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

function renderThreatTrend(settings: TrafficStatsDebugSettings) {
  const axisFontSize = resolveTickFontSize(settings.uiScale, settings.trendAxisLabelScale);
  const yAxisWidth = resolveYAxisWidth(
    Math.max(...THREAT_TREND_DATA.map((item) => Math.max(item.high, item.medium, item.low))),
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
        <div className="threat-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={THREAT_TREND_DATA} margin={{ top: 10, right: 4, left: 0, bottom: 2 }}>
            <YAxis
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              tickMargin={8}
              tick={{ fill: 'rgba(255,255,255,0.34)', fontSize: axisFontSize, fontWeight: 700 }}
            />
            <XAxis
              dataKey="date"
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
              fillOpacity={settings.trendAreaOpacity}
              strokeWidth={settings.trendStrokeWidth}
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="medium"
              stroke="var(--threat-medium)"
              fill="var(--threat-medium)"
              fillOpacity={settings.trendAreaOpacity}
              strokeWidth={settings.trendStrokeWidth}
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="var(--threat-low)"
              fill="var(--threat-low)"
              fillOpacity={settings.trendAreaOpacity}
              strokeWidth={settings.trendStrokeWidth}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={yAxisWidth}
                    tickMargin={8}
                    tick={{ fill: 'rgba(255,255,255,0.34)', fontSize: yAxisFontSize, fontWeight: 700 }}
                  />
                  <XAxis
                    dataKey="countryCode"
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

function renderThreatSummary() {
  const totals = summarizeThreatFrequency(THREAT_TREND_DATA);
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
      </div>
    </div>
  );
}

export function TrafficStatsSection(props: TrafficStatsSectionProps) {
  const { sectionRef, data, loading, error, settings } = props;
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
        ['--traffic-panel-padding-x' as string]: `${settings.panelPaddingX}px`,
        ['--traffic-panel-padding-top' as string]: `${settings.panelPaddingTop}px`,
        ['--traffic-panel-padding-bottom' as string]: `${settings.panelPaddingBottom}px`,
        ['--traffic-summary-value-scale' as string]: String(settings.summaryValueScale),
      }}
    >
      {renderThreatTrend(settings)}
      {renderTrafficVolumePanel(summary.bars, settings, isLoading, error, hasData, summary.totalVolume)}
      {renderThreatSummary()}
    </section>
  );
}
