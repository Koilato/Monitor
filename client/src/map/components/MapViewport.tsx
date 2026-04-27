import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';
import type { CountryHoverEvent, HoverCountryState, MapDebugSettings, PopupAnchor } from 'map/state/map-types';
import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapCameraState, MapState } from 'map/state/map-state';
import { IncidentPopup } from 'map/components/IncidentPopup';
import { MapRenderer } from 'map/components/MapRenderer';
import { THREAT_LEGEND } from 'map/layers/tokens';
import { useThemeRevision } from 'shared/styles/theme';

interface MapViewportProps {
  mapState: MapState;
  hoveredCountry: HoverCountryState | null;
  hoverData: CountryHoverResponse | null;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  loading: boolean;
  error: string | null;
  anchor: PopupAnchor | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  onCameraChange: (camera: Partial<MapCameraState>) => void;
  debugSettings: MapDebugSettings;
}

export function MapViewport(props: MapViewportProps) {
  const {
    mapState,
    hoveredCountry,
    hoverData,
    flowData,
    threatData,
    loading,
    error,
    anchor,
    onCountryHover,
    onCameraChange,
    debugSettings,
  } = props;
  const themeRevision = useThemeRevision();

  return (
    <div className="map-container">
      <div className="map-stage">
        <MapRenderer
          mapState={mapState}
          themeRevision={themeRevision}
          hoveredCountryCode={hoveredCountry?.code ?? null}
          hoverData={hoverData}
          flowData={flowData}
          threatData={threatData}
          flowMode={mapState.flowMode}
          flowPlaybackMode={mapState.flowPlaybackMode}
          onCountryHover={onCountryHover}
          onCameraChange={onCameraChange}
          debugSettings={debugSettings}
        />
      </div>

      <div className="threat-legend" aria-label="威胁等级图例">
        <span className="threat-legend-label">{THREAT_LEGEND.label}</span>
        {THREAT_LEGEND.items.map((item) => (
          <span className="threat-legend-item" key={item.label}>
            <i
              className="threat-legend-swatch"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </div>

      <IncidentPopup
        country={hoveredCountry}
        data={hoverData}
        anchor={anchor}
        loading={loading}
        error={error}
      />
    </div>
  );
}
