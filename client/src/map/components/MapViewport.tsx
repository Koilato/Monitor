import { memo, useLayoutEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, ThreatMapResponse } from '@shared/types';
import type { CountrySelectEvent, MapDebugSettings, PopupAnchor, SelectedCountryState } from 'map/state/map-types';
import type { FlowArcSource } from 'map/lib/arc-data';
import type { MapCameraState, MapState } from 'map/state/map-state';
import { IncidentPopup } from 'map/components/IncidentPopup';
import { MapRenderer } from 'map/components/MapRenderer';
import type { PopupViewport } from 'map/lib/popup-layout';
import { THREAT_LEGEND } from 'map/layers/tokens';
import { useThemeRevision } from 'shared/styles/theme';

interface MapViewportProps {
  mapState: MapState;
  selectedCountry: SelectedCountryState | null;
  countryData: CountryHoverResponse | null;
  flowData: FlowArcSource | null;
  threatData: ThreatMapResponse | null;
  loading: boolean;
  error: string | null;
  anchor: PopupAnchor | null;
  onCountrySelect: (event: CountrySelectEvent) => void;
  onCameraChange: (camera: Partial<MapCameraState>) => void;
  debugSettings: MapDebugSettings;
}

export const MapViewport = memo(function MapViewport(props: MapViewportProps) {
  const {
    mapState,
    selectedCountry,
    countryData,
    flowData,
    threatData,
    loading,
    error,
    anchor,
    onCountrySelect,
    onCameraChange,
    debugSettings,
  } = props;
  const themeRevision = useThemeRevision();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [popupViewport, setPopupViewport] = useState<PopupViewport | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const updateViewport = () => {
      const rect = container.getBoundingClientRect();

      setPopupViewport((current) => {
        if (
          current
          && Math.abs(current.left - rect.left) < 0.5
          && Math.abs(current.top - rect.top) < 0.5
          && Math.abs(current.width - rect.width) < 0.5
          && Math.abs(current.height - rect.height) < 0.5
        ) {
          return current;
        }

        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      });
    };

    updateViewport();

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateViewport);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  return (
    <div className="map-container" ref={containerRef}>
      <div className="map-stage">
        <MapRenderer
          mapState={mapState}
          themeRevision={themeRevision}
          flowData={flowData}
          threatData={threatData}
          flowPlaybackMode={mapState.flowPlaybackMode}
          onCountrySelect={onCountrySelect}
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
        country={selectedCountry}
        data={countryData}
        anchor={anchor}
        viewport={popupViewport}
        loading={loading}
        error={error}
      />
    </div>
  );
});
