import type { CountryHoverResponse } from '@shared/types';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from '../lib/types';
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
}

export function MapViewport(props: MapViewportProps) {
  const { viewMode, hoveredCountry, data, loading, error, anchor, onCountryHover } = props;

  return (
    <div className={`map-container map-container--${viewMode}`}>
      {viewMode === '2d' ? (
        <TwoDMap
          hoveredCountryCode={hoveredCountry?.code ?? null}
          data={data}
          onCountryHover={onCountryHover}
        />
      ) : (
        <Globe3DMap
          hoveredCountryCode={hoveredCountry?.code ?? null}
          data={data}
          onCountryHover={onCountryHover}
        />
      )}

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
