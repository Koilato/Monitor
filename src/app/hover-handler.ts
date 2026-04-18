import type { MapContainer } from '@/components/MapContainer';
import { CountryInfoPanel } from '@/components/CountryInfoPanel';
import { RiskIndicatorsPanel } from '@/components/RiskIndicatorsPanel';
import { fetchFlowsToCountry } from '@/services/country-flows';
import { fetchCountryRisk } from '@/services/country-risk';

export class HoverHandler {
  private infoPanel: CountryInfoPanel;
  private riskPanel: RiskIndicatorsPanel;
  private map: MapContainer;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(map: MapContainer, infoPanel: CountryInfoPanel, riskPanel: RiskIndicatorsPanel) {
    this.map = map;
    this.infoPanel = infoPanel;
    this.riskPanel = riskPanel;

    // 设置初始状态
    this.infoPanel.clear();
    this.riskPanel.clear();

    // 监听地图悬停事件
    this.map.setOnCountryHover((country) => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (!country) {
        this.infoPanel.clear();
        this.riskPanel.clear();
        this.map.setHoverFlows([]);
        return;
      }
      // 防抖 150ms
      this.debounceTimer = setTimeout(() => this.handleHover(country.code, country.name), 150);
    });
  }

  private async handleHover(code: string, name: string): Promise<void> {
    try {
      const [flows, risk] = await Promise.all([
        fetchFlowsToCountry(code),
        fetchCountryRisk(code),
      ]);

      // 更新文本面板
      const flowCount = flows.length;
      this.infoPanel.setContent(`${name} (${code}) — ${flowCount} 条流向数据`);

      // 更新箭头
      this.map.setHoverFlows(flows);

      // 更新风险面板
      if (risk) {
        this.riskPanel.update(risk);
      } else {
        this.riskPanel.clear();
      }
    } catch {
      this.infoPanel.setContent(`${name} (${code})`);
      this.riskPanel.clear();
    }
  }
}
