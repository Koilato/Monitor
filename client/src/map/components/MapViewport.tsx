import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';
import type { CountryHoverEvent, HoverCountryState, MapDebugSettings, PopupAnchor } from 'map/state/map-types';
import type { MapCameraState, MapState } from 'map/state/map-state';
import { LAYER_MODULES } from 'map/layers/modules';
import { IncidentPopup } from 'map/components/IncidentPopup';
import { MapRenderer } from 'map/components/MapRenderer';

interface MapViewportProps {
  viewMode: '2d' | '3d';
  mapState: MapState;
  hoveredCountry: HoverCountryState | null;
  data: CountryHoverResponse | null;
  threatData: ThreatMapResponse | null;
  loading: boolean;
  error: string | null;
  anchor: PopupAnchor | null;
  onCountryHover: (event: CountryHoverEvent) => void;
  onCameraChange: (camera: Partial<MapCameraState>) => void;
  onActiveLayerIdsChange: (activeLayerIds: string[]) => void;
  debugSettings: MapDebugSettings;
}

export function MapViewport(props: MapViewportProps) {
  const {
    viewMode,
    mapState,
    hoveredCountry,
    data,
    threatData,
    loading,
    error,
    anchor,
    onCountryHover,
    onCameraChange,
    onActiveLayerIdsChange,
    debugSettings,
  } = props;

  const visibleModules = LAYER_MODULES.filter((module) => module.supportsView.includes(viewMode));
  const legendItems = visibleModules.flatMap((module) => module.legend?.items ?? []);

  return (
    <div className={`map-container map-container--${viewMode}`}>
      <div className="map-stage">
        <MapRenderer
          viewMode={viewMode}
          mapState={mapState}
          hoveredCountryCode={hoveredCountry?.code ?? null}
          data={data}
          threatData={threatData}
          onCountryHover={onCountryHover}
          onCameraChange={onCameraChange}
          debugSettings={debugSettings}
        />
      </div>

      <div className="threat-legend" aria-label="Threat level legend and layer controls">
        <span className="threat-legend-label">LAYERS</span>
        {visibleModules.map((module) => (
          <label className="threat-legend-item" key={module.id}>
            <input
              type="checkbox"
              checked={mapState.activeLayerIds.includes(module.id)}
              onChange={(event) => onActiveLayerIdsChange(
                event.target.checked
                  ? [...new Set([...mapState.activeLayerIds, module.id])]
                  : mapState.activeLayerIds.filter((id) => id !== module.id),
              )}
            />
            <span>{module.label}</span>
          </label>
        ))}
        {legendItems.length > 0 ? <span className="threat-legend-label">THREAT</span> : null}
        {legendItems.map((item) => (
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
        data={data}
        anchor={anchor}
        loading={loading}
        error={error}
      />
    </div>
  );
}
