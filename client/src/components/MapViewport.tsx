import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from '../lib/types';
import type { MapDebugSettings } from '../lib/types';
import { IncidentPopup } from './IncidentPopup';
import { Globe3DMap } from './Globe3DMap';
import { TwoDMap } from './TwoDMap';
import { THREAT_LEVEL_COLORS } from '../hooks/useMapDataSync';

interface MapViewportProps {
  viewMode: '2d' | '3d';
  hoveredCountry: HoverCountryState | null;
  data: CountryHoverResponse | null;
  threatData: ThreatMapResponse | null;
  loading: boolean;
  error: string | null;
  anchor: PopupAnchor | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  debugSettings: MapDebugSettings;
}

export function MapViewport(props: MapViewportProps) {
  const {
    viewMode,
    hoveredCountry,
    data,
    threatData,
    loading,
    error,
    anchor,
    onCountryHover,
    debugSettings,
  } = props;

  return (
    <div className={`map-container map-container--${viewMode}`}>
      <div className="map-stage">
        {viewMode === '2d' ? (
          <TwoDMap
            hoveredCountryCode={hoveredCountry?.code ?? null}
            data={data}
            threatData={threatData}
            onCountryHover={onCountryHover}
            debugSettings={debugSettings}
          />
        ) : (
          <Globe3DMap
            hoveredCountryCode={hoveredCountry?.code ?? null}
            data={data}
            threatData={threatData}
            onCountryHover={onCountryHover}
            debugSettings={debugSettings}
          />
        )}
      </div>

      <div className="threat-legend" aria-label="Threat level legend">
        <span className="threat-legend-label">THREAT</span>
        {([
          ['low', 'LOW'],
          ['medium', 'MED'],
          ['high', 'HIGH'],
          ['critical', 'CRIT'],
        ] as const).map(([level, label]) => (
          <span className="threat-legend-item" key={level}>
            <i
              className="threat-legend-swatch"
              style={{ backgroundColor: THREAT_LEVEL_COLORS[level] }}
            />
            <span>{label}</span>
          </span>
        ))}
      </div>

      <IncidentPopup
        country={hoveredCountry}
        data={data}
        anchor={anchor}
        loading={loading}
        error={error}
      />
    </div>
  );
}
