import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';
import type { CountryHoverEvent, HoverCountryState, MapDebugSettings, PopupAnchor } from 'map/state/map-types';
import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapCameraState, MapState } from 'map/state/map-state';
import { LAYER_MODULES } from 'map/layers/modules';
import { IncidentPopup } from 'map/components/IncidentPopup';
import { MapRenderer } from 'map/components/MapRenderer';
import { useThemeRevision } from 'shared/styles/theme';

interface MapViewportProps {
  viewMode: '2d' | '3d';
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
  onActiveLayerIdsChange: (activeLayerIds: string[]) => void;
  debugSettings: MapDebugSettings;
}

export function MapViewport(props: MapViewportProps) {
  const {
    viewMode,
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
    onActiveLayerIdsChange,
    debugSettings,
  } = props;
  const themeRevision = useThemeRevision();

  const visibleModules = LAYER_MODULES.filter(
    (module) => module.supportsView.includes(viewMode) && module.showInLayerControls !== false,
  );
  const legendItems = visibleModules.flatMap((module) => module.legend?.items ?? []);

  return (
    <div className="map-container">
      <div className="map-stage">
        <MapRenderer
          viewMode={viewMode}
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

      <div className="threat-legend" aria-label="威胁等级图例和图层控制">
        <span className="threat-legend-label">图层</span>
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
        {legendItems.length > 0 ? <span className="threat-legend-label">威胁</span> : null}
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
          data={hoverData}
          anchor={anchor}
          loading={loading}
          error={error}
        />
    </div>
  );
}
