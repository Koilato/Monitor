import { AttackArcCanvas } from 'map/components/AttackArcCanvas';
import { useMapRuntime } from 'map/hooks/useMapRuntime';
import { DEFAULT_MAP_STATE } from 'map/state/map-state';
import type { MapViewProps } from 'map/state/map-types';

export function MapRenderer(props: MapViewProps) {
  const {
    onCameraChange,
    mapState,
    flowData,
    threatData,
    flowPlaybackMode,
    debugSettings,
    themeRevision,
  } = props;
  const { containerRef, mapRef, mapReady } = useMapRuntime(props);

  return (
    <div className="map-wrapper">
      <div className="map-surface" id="deckgl-basemap" ref={containerRef} />
      <AttackArcCanvas
        mapRef={mapRef}
        mapReady={mapReady}
        isEnabled={mapState.activeLayerIds.includes('attack-arcs')}
        flowData={flowData}
        threatData={threatData}
        activeThreatCountryCodes={debugSettings.activeCountryCodes}
        playbackMode={flowPlaybackMode}
        themeRevision={themeRevision}
        debugSettings={debugSettings}
      />
      <div className="map-controls">
        <div className="zoom-controls">
          <button
            type="button"
            className="map-btn"
            aria-label="放大"
            onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
          >
            +
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="缩小"
            onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
          >
            -
          </button>
          <button
            type="button"
            className="map-btn"
            aria-label="重置视图"
            onClick={() => {
              onCameraChange(DEFAULT_MAP_STATE.camera);
            }}
          >
            o
          </button>
        </div>
      </div>
    </div>
  );
}
