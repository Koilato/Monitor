import type { ThreatCountryStat, ThreatMapResponse } from '@shared/types';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource } from 'maplibre-gl';

import { getCountryLabelAnchor, getCountryName } from 'map/lib/country-geometry';
import { getChineseCountryName } from 'map/lib/country-names-zh';
import type { LayerRenderContext } from 'map/layers/registry';

export const THREAT_LABEL_SOURCE_ID = 'threat-labels-source';
export const THREAT_LABEL_LAYER_ID = 'threat-labels';

function createEmptyThreatLabelFeatureCollection(): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function compareThreatPriority(left: ThreatCountryStat, right: ThreatCountryStat): number {
  if (right.threatScore !== left.threatScore) {
    return right.threatScore - left.threatScore;
  }

  if (right.incidentCount !== left.incidentCount) {
    return right.incidentCount - left.incidentCount;
  }

  return left.country.localeCompare(right.country);
}

export function resolveThreatLabelName(code: string, englishName: string | null): string {
  return getChineseCountryName(code)
    ?? englishName
    ?? code;
}

export async function buildThreatLabelFeatures(
  threatData: ThreatMapResponse | null,
): Promise<FeatureCollection<Point>> {
  if (!threatData || threatData.countries.length === 0) {
    return createEmptyThreatLabelFeatureCollection();
  }

  const sortedCountries = [...threatData.countries].sort(compareThreatPriority);
  const features = await Promise.all(sortedCountries.map(async (country) => {
    const [anchor, englishName] = await Promise.all([
      getCountryLabelAnchor(country.country),
      getCountryName(country.country),
    ]);

    if (!anchor) {
      return null;
    }

    return {
      type: 'Feature' as const,
      properties: {
        label: resolveThreatLabelName(country.country, englishName),
        'ISO3166-1-Alpha-2': country.country,
        threatLevel: country.threatLevel,
        threatScore: country.threatScore,
        incidentCount: country.incidentCount,
        sortKey: -((country.threatScore * 1000) + country.incidentCount),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [anchor.lon, anchor.lat] as [number, number],
      },
    };
  }));

  return {
    type: 'FeatureCollection',
    features: features.filter((feature): feature is NonNullable<typeof feature> => feature !== null),
  };
}

export function ensureThreatLabelSource(context: LayerRenderContext) {
  if (context.map.getSource(THREAT_LABEL_SOURCE_ID)) {
    return;
  }

  context.map.addSource(THREAT_LABEL_SOURCE_ID, {
    type: 'geojson',
    data: createEmptyThreatLabelFeatureCollection(),
  });
}

export function registerThreatLabelLayer(context: LayerRenderContext) {
  if (context.map.getLayer(THREAT_LABEL_LAYER_ID)) {
    return;
  }

  context.map.addLayer({
    id: THREAT_LABEL_LAYER_ID,
    type: 'symbol',
    source: THREAT_LABEL_SOURCE_ID,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular', 'Open Sans Regular'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        10,
        2,
        11,
        4,
        13,
      ],
      'text-letter-spacing': 0.02,
      'text-max-width': 8,
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'symbol-sort-key': ['get', 'sortKey'],
    },
    paint: {
      'text-color': '#F4F5F7',
      'text-halo-color': 'rgba(12,14,18,0.94)',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.4,
    },
  });
}

export async function applyThreatLabelState(context: LayerRenderContext) {
  const source = context.map.getSource(THREAT_LABEL_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) {
    return;
  }

  source.setData(await buildThreatLabelFeatures(context.threatData));
}
