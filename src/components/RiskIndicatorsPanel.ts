import { Panel } from './Panel';
import type { CountryRiskData } from '@/services/country-risk';

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

export class RiskIndicatorsPanel extends Panel {
  constructor() {
    super({ id: 'risk-indicators', title: '风险指标' });
  }

  update(data: CountryRiskData): void {
    const riskColor = RISK_COLORS[data.riskLevel] ?? '#6b7280';
    const riskLabel = RISK_LABELS[data.riskLevel] ?? data.riskLevel;
    const content = this.element.querySelector('.panel-content') as HTMLElement | null;
    if (content) {
      content.innerHTML = `
        <div style="padding:8px 12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--text-dim);">风险等级</span>
            <div style="flex:1;height:6px;background:var(--surface);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${data.riskScore}%;background:${riskColor};border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <span style="font-size:12px;font-weight:bold;color:${riskColor};">${data.riskScore}/100</span>
            <span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${riskColor}22;color:${riskColor};">${riskLabel}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--text-dim);">供应链指数</span>
            <span style="font-size:14px;font-weight:bold;color:var(--text);">${data.supplyChainIndex}</span>
          </div>
          <div style="border-top:1px solid var(--border);padding-top:6px;">
            ${data.customMetrics.map(m => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;">
                <span style="font-size:12px;color:var(--text-dim);">${m.name}</span>
                <span style="font-size:12px;font-weight:500;color:var(--text);">${m.value}${m.unit ?? ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  clear(): void {
    const content = this.element.querySelector('.panel-content') as HTMLElement | null;
    if (content) {
      content.innerHTML = `<div style="padding:8px 12px;font-size:13px;color:var(--text-dim);">悬停地图上的国家查看风险指标</div>`;
    }
  }
}
