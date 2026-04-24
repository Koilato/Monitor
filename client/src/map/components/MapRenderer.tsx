import { useMapRuntime } from 'map/hooks/useMapRuntime';
import { DEFAULT_MAP_STATE } from 'map/state/map-state';
import type { MapViewProps } from 'map/state/map-types';

export function MapRenderer(props: MapViewProps) {
  const { viewMode, onCameraChange } = props;
  const { containerRef, mapRef } = useMapRuntime(props);

  return (
    <div className="deckgl-map-wrapper">
      <div className="map-surface" id="deckgl-basemap" ref={containerRef} />
      <div className="deckgl-controls">
        <div className="zoom-controls">
          <button
            type="button"
            className="map-btn"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
          >
            +
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
          >
            -
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="Reset view"
            onClick={() => {
              const defaults = viewMode === '3d'
                ? {
                  ...DEFAULT_MAP_STATE.camera,
                  zoom: 1.2,
                  pitch: 55,
                }
                : DEFAULT_MAP_STATE.camera;
              onCameraChange(defaults);
            }}
          >
            o
          </button>
        </div>
      </div>
    </div>
  );
}
