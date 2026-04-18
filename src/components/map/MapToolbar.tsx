import React from 'react';
import { useMapStore } from '@/stores/map-store';

export const MapToolbar: React.FC = () => {
  const mapMode = useMapStore((s) => s.mapMode);
  const setMapMode = useMapStore((s) => s.setMapMode);

  return (
    <div className="map-toolbar" data-testid="map-toolbar">
      <button
        className={`map-toolbar-btn ${mapMode === 'deckgl' ? 'active' : ''}`}
        onClick={() => setMapMode('deckgl')}
        title="Flat map"
      >
        🗺️
      </button>
      <button
        className={`map-toolbar-btn ${mapMode === 'globe' ? 'active' : ''}`}
        onClick={() => setMapMode('globe')}
        title="3D Globe"
      >
        🌍
      </button>
    </div>
  );
};
