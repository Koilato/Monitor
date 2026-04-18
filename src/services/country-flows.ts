/** 后端端点格式: { destCountry, srcCountry, time, ...info } */
export interface CountryFlow {
  destCountry: string;
  srcCountry: string;
  time: string;
  flowType: string;
  volume: number;
  label?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

const MOCK_FLOWS: CountryFlow[] = [
  { destCountry: 'CN', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 580000000000, label: '贸易' },
  { destCountry: 'CN', srcCountry: 'JP', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 320000000000, label: '贸易' },
  { destCountry: 'CN', srcCountry: 'DE', time: '2026-04-18T00:00:00Z', flowType: 'investment', volume: 15000000000, label: '投资' },
  { destCountry: 'CN', srcCountry: 'KR', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 280000000000, label: '贸易' },
  { destCountry: 'CN', srcCountry: 'AU', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 180000000000, label: '矿产' },
  { destCountry: 'CN', srcCountry: 'BR', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 120000000000, label: '农产品' },
  { destCountry: 'US', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 450000000000, label: '贸易' },
  { destCountry: 'US', srcCountry: 'JP', time: '2026-04-18T00:00:00Z', flowType: 'investment', volume: 750000000000, label: '投资' },
  { destCountry: 'US', srcCountry: 'DE', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 200000000000, label: '贸易' },
  { destCountry: 'US', srcCountry: 'GB', time: '2026-04-18T00:00:00Z', flowType: 'investment', volume: 500000000000, label: '投资' },
  { destCountry: 'DE', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 250000000000, label: '贸易' },
  { destCountry: 'DE', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 180000000000, label: '贸易' },
  { destCountry: 'DE', srcCountry: 'FR', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 220000000000, label: '贸易' },
  { destCountry: 'JP', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 200000000000, label: '贸易' },
  { destCountry: 'JP', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 150000000000, label: '贸易' },
  { destCountry: 'JP', srcCountry: 'KR', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 90000000000, label: '贸易' },
  { destCountry: 'GB', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 130000000000, label: '贸易' },
  { destCountry: 'GB', srcCountry: 'DE', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 100000000000, label: '贸易' },
  { destCountry: 'FR', srcCountry: 'DE', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 170000000000, label: '贸易' },
  { destCountry: 'FR', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 80000000000, label: '贸易' },
  { destCountry: 'RU', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 110000000000, label: '贸易' },
  { destCountry: 'RU', srcCountry: 'DE', time: '2026-04-18T00:00:00Z', flowType: 'energy', volume: 50000000000, label: '能源' },
  { destCountry: 'IN', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 100000000000, label: '贸易' },
  { destCountry: 'IN', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 60000000000, label: '贸易' },
  { destCountry: 'IN', srcCountry: 'AE', time: '2026-04-18T00:00:00Z', flowType: 'energy', volume: 40000000000, label: '能源' },
  { destCountry: 'AU', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 150000000000, label: '矿产' },
  { destCountry: 'AU', srcCountry: 'JP', time: '2026-04-18T00:00:00Z', flowType: 'energy', volume: 35000000000, label: '能源' },
  { destCountry: 'BR', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'trade', volume: 90000000000, label: '贸易' },
  { destCountry: 'BR', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'investment', volume: 20000000000, label: '投资' },
  { destCountry: 'SA', srcCountry: 'CN', time: '2026-04-18T00:00:00Z', flowType: 'energy', volume: 45000000000, label: '石油' },
  { destCountry: 'SA', srcCountry: 'US', time: '2026-04-18T00:00:00Z', flowType: 'energy', volume: 30000000000, label: '石油' },
];

export async function fetchFlowsToCountry(destCountry: string): Promise<CountryFlow[]> {
  if (!API_BASE) {
    return MOCK_FLOWS.filter(f => f.destCountry === destCountry);
  }
  try {
    const resp = await fetch(`${API_BASE}/api/flows?dest=${destCountry}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.flows ?? [];
  } catch {
    return MOCK_FLOWS.filter(f => f.destCountry === destCountry);
  }
}
