import React from 'react';

interface PanelShellProps {
  id: string;
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  count?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const PanelShell: React.FC<PanelShellProps> = ({
  id,
  title,
  children,
  collapsed = false,
  onToggleCollapse,
  count,
  severity,
}) => {
  return (
    <div className="panel" data-panel={id}>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
        {count !== undefined && <span className="panel-count">{count}</span>}
        {severity && <span className={`panel-severity panel-severity--${severity}`} />}
        {onToggleCollapse && (
          <button
            className="panel-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        )}
      </div>
      {!collapsed && <div className="panel-content" id={`${id}Content`}>{children}</div>}
    </div>
  );
};
