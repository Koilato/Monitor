import React from 'react';

interface MapContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface MapContextMenuProps {
  x: number;
  y: number;
  items: MapContextMenuItem[];
  onClose: () => void;
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({ x, y, items, onClose }) => {
  return (
    <div
      className="map-context-menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      data-testid="map-context-menu"
    >
      {items.map((item, i) => (
        <button
          key={i}
          className="map-context-menu-item"
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
