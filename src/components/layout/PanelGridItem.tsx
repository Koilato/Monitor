import React from 'react';

interface PanelGridItemProps {
  panelId: string;
  rowSpan?: number;
  colSpan?: number;
  children: React.ReactNode;
}

export const PanelGridItem: React.FC<PanelGridItemProps> = ({
  panelId,
  rowSpan = 1,
  colSpan = 1,
  children,
}) => {
  const colClass = colSpan > 1 ? `col-span-${colSpan}` : '';
  const rowClass = rowSpan > 1 ? `row-span-${rowSpan}` : '';

  return (
    <div
      className={`panel-grid-item ${colClass} ${rowClass}`.trim()}
      data-panel={panelId}
      data-testid={`panel-grid-item-${panelId}`}
    >
      {children}
    </div>
  );
};
