import React from 'react';
import { useMapStore } from '@/stores/map-store';
import { useAppStore } from '@/stores/app-store';

export const MapContainer: React.FC = () => {
  const mapMode = useMapStore((s) => s.mapMode);
  const isMobile = useAppStore((s) => s.isMobile);

  // Map components will be implemented in future iterations
  // Currently, the legacy DeckGLMap/GlobeMap is rendered by App.renderLayout()
  const _mapMode = mapMode;
  const _isMobile = isMobile;
  void _mapMode;
  void _isMobile;

  return (
    <div className="map-container" data-testid="map-container">
      <div className="map-placeholder">
        {/* Legacy map (DeckGLMap/GlobeMap) is rendered by App.renderLayout() */}
        {/* React map wrappers will replace this in future iterations */}
      </div>
    </div>
  );
};
