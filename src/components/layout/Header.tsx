import React from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';

export const Header: React.FC = () => {
  const openSearchModal = useUIStore((s) => s.openSearchModal);
  const openSettings = useUIStore((s) => s.openSettings);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <header className="app-header" data-testid="app-header">
      <div className="header-left">
        <span className="header-logo">World Monitor</span>
      </div>
      <div className="header-center">
        {/* Breaking news banner will be rendered here */}
      </div>
      <div className="header-right">
        <button className="header-btn" onClick={openSearchModal} aria-label="Search" title="Search (Ctrl+K)">
          🔍
        </button>
        <button
          className="header-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="header-btn" onClick={openSettings} aria-label="Settings" title="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
};
