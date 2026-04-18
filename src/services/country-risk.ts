export interface CountryRiskData {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  supplyChainIndex: number;
  customMetrics: Array<{ name: string; value: number; unit?: string }>;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const MOCK_RISK: Record<string, CountryRiskData> = {
  CN: { riskScore: 45, riskLevel: 'medium', supplyChainIndex: 72, customMetrics: [{ name: '政治稳定性', value: 65, unit: '' }, { name: '经济风险', value: 38, unit: '' }, { name: '贸易开放度', value: 55, unit: '' }] },
  US: { riskScore: 25, riskLevel: 'low', supplyChainIndex: 88, customMetrics: [{ name: '政治稳定性', value: 78, unit: '' }, { name: '经济风险', value: 22, unit: '' }, { name: '贸易开放度', value: 70, unit: '' }] },
  DE: { riskScore: 20, riskLevel: 'low', supplyChainIndex: 85, customMetrics: [{ name: '政治稳定性', value: 82, unit: '' }, { name: '经济风险', value: 18, unit: '' }, { name: '贸易开放度', value: 80, unit: '' }] },
  JP: { riskScore: 30, riskLevel: 'low', supplyChainIndex: 82, customMetrics: [{ name: '政治稳定性', value: 80, unit: '' }, { name: '经济风险', value: 28, unit: '' }, { name: '贸易开放度', value: 60, unit: '' }] },
  GB: { riskScore: 28, riskLevel: 'low', supplyChainIndex: 80, customMetrics: [{ name: '政治稳定性', value: 75, unit: '' }, { name: '经济风险', value: 25, unit: '' }, { name: '贸易开放度', value: 75, unit: '' }] },
  FR: { riskScore: 22, riskLevel: 'low', supplyChainIndex: 83, customMetrics: [{ name: '政治稳定性', value: 77, unit: '' }, { name: '经济风险', value: 20, unit: '' }, { name: '贸易开放度', value: 72, unit: '' }] },
  RU: { riskScore: 78, riskLevel: 'high', supplyChainIndex: 35, customMetrics: [{ name: '政治稳定性', value: 25, unit: '' }, { name: '经济风险', value: 72, unit: '' }, { name: '制裁影响', value: 85, unit: '' }] },
  IN: { riskScore: 40, riskLevel: 'medium', supplyChainIndex: 65, customMetrics: [{ name: '政治稳定性', value: 60, unit: '' }, { name: '经济风险', value: 35, unit: '' }, { name: '贸易开放度', value: 50, unit: '' }] },
  BR: { riskScore: 48, riskLevel: 'medium', supplyChainIndex: 58, customMetrics: [{ name: '政治稳定性', value: 55, unit: '' }, { name: '经济风险', value: 42, unit: '' }, { name: '贸易开放度', value: 45, unit: '' }] },
  AU: { riskScore: 18, riskLevel: 'low', supplyChainIndex: 90, customMetrics: [{ name: '政治稳定性', value: 85, unit: '' }, { name: '经济风险', value: 15, unit: '' }, { name: '贸易开放度', value: 78, unit: '' }] },
  KR: { riskScore: 25, riskLevel: 'low', supplyChainIndex: 80, customMetrics: [{ name: '政治稳定性', value: 72, unit: '' }, { name: '经济风险', value: 22, unit: '' }, { name: '贸易开放度', value: 65, unit: '' }] },
  SA: { riskScore: 42, riskLevel: 'medium', supplyChainIndex: 55, customMetrics: [{ name: '政治稳定性', value: 50, unit: '' }, { name: '经济风险', value: 38, unit: '' }, { name: '地缘风险', value: 60, unit: '' }] },
  AE: { riskScore: 22, riskLevel: 'low', supplyChainIndex: 75, customMetrics: [{ name: '政治稳定性', value: 80, unit: '' }, { name: '经济风险', value: 18, unit: '' }, { name: '贸易开放度', value: 85, unit: '' }] },
};

export async function fetchCountryRisk(countryCode: string): Promise<CountryRiskData | null> {
  if (!API_BASE) {
    return MOCK_RISK[countryCode] ?? null;
  }
  try {
    const resp = await fetch(`${API_BASE}/api/risk?country=${countryCode}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return MOCK_RISK[countryCode] ?? null;
  }
}
