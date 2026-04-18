import React from 'react';
import { Header } from './Header';
import { PanelGrid } from './PanelGrid';
import { BottomBar } from './BottomBar';

export const AppShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell" data-testid="app-shell">
      <Header />
      <main className="app-main">
        {children ?? <PanelGrid />}
      </main>
      <BottomBar />
    </div>
  );
};
