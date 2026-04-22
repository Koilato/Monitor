import type { CountryHoverResponse } from '@shared/types';

import { getCountryCentroid } from 'map/lib/country-geometry';

export interface TwoDArcDatum {
  id: string;
  source: [number, number];
  target: [number, number];
  arrowPosition: [number, number];
  label: string;
  count: number;
  angle: number;
}

function getBearing(source: [number, number], target: [number, number]): number {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function interpolatePosition(
  source: [number, number],
  target: [number, number],
  t: number,
): [number, number] {
  return [
    source[0] + ((target[0] - source[0]) * t),
    source[1] + ((target[1] - source[1]) * t),
  ];
}

export async function buildTwoDArcData(data: CountryHoverResponse | null): Promise<TwoDArcDatum[]> {
  if (!data) {
    return [];
  }

  const target = await getCountryCentroid(data.victimCountry);
  if (!target) {
    return [];
  }

  const rows = await Promise.all(data.flows.map(async (flow) => {
    const source = await getCountryCentroid(flow.attackerCountry);
    if (!source) {
      return null;
    }

    const sourcePosition: [number, number] = [source.lon, source.lat];
    const targetPosition: [number, number] = [target.lon, target.lat];

    return {
      id: `${flow.attackerCountry}-${flow.victimCountry}`,
      source: sourcePosition,
      target: targetPosition,
      arrowPosition: interpolatePosition(sourcePosition, targetPosition, 0.975),
      label: `${flow.attackerCountry} → ${flow.victimCountry}`,
      count: flow.count,
      angle: getBearing(sourcePosition, targetPosition),
    };
  }));

  return rows.filter((row): row is TwoDArcDatum => row !== null);
}
