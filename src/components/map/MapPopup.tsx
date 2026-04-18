import React from 'react';

interface MapPopupProps {
  coordinates: { lng: number; lat: number };
  children: React.ReactNode;
  onClose?: () => void;
}

export const MapPopup: React.FC<MapPopupProps> = ({ coordinates, children, onClose }) => {
  return (
    <div
      className="map-popup"
      style={{ left: `${coordinates.lng}px`, top: `${coordinates.lat}px` }}
      data-testid="map-popup"
    >
      <div className="map-popup-content">{children}</div>
      {onClose && (
        <button className="map-popup-close" onClick={onClose} aria-label="Close popup">
          ✕
        </button>
      )}
    </div>
  );
};
