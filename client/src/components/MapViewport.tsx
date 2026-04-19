import type { CountryHoverResponse } from '@shared/types';
import type { CSSProperties } from 'react';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from '../lib/types';
import type { MapDebugSettings } from '../lib/types';
import { IncidentPopup } from './IncidentPopup';
import { Globe3DMap } from './Globe3DMap';
import { TwoDMap } from './TwoDMap';

interface MapViewportProps {
  viewMode: '2d' | '3d';
  hoveredCountry: HoverCountryState | null;
  data: CountryHoverResponse | null;
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
    loading,
    error,
    anchor,
    onCountryHover,
    debugSettings,
  } = props;

  const stageStyle = {
    inset: `${debugSettings.viewportPadding}px`,
  } satisfies CSSProperties;

  return (
    <div className={`map-container map-container--${viewMode}`}>
      <div className="map-stage" style={stageStyle}>
        {viewMode === '2d' ? (
          <TwoDMap
            hoveredCountryCode={hoveredCountry?.code ?? null}
            data={data}
            onCountryHover={onCountryHover}
            debugSettings={debugSettings}
          />
        ) : (
          <Globe3DMap
            hoveredCountryCode={hoveredCountry?.code ?? null}
            data={data}
            onCountryHover={onCountryHover}
            debugSettings={debugSettings}
          />
        )}
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
