import React from 'react';
import { useUIStore } from '@/stores/ui-store';

export const BottomBar: React.FC = () => {
  const initialLoadComplete = useUIStore((s) => s.initialLoadComplete);

  return (
    <footer className="app-bottom-bar" data-testid="bottom-bar">
      <div className="bottom-bar-left">
        <span className="bottom-bar-status">
          {initialLoadComplete ? '● Connected' : '○ Loading...'}
        </span>
      </div>
      <div className="bottom-bar-right">
        <span className="bottom-bar-version">v2.6.7</span>
      </div>
    </footer>
  );
};
