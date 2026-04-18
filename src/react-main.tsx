import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LiveChannelsPage } from '@/pages/LiveChannelsPage';

const ReactApp: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/channels" element={<LiveChannelsPage />} />
    </Routes>
  </BrowserRouter>
);

const rootEl = document.getElementById('react-root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ReactApp />
    </React.StrictMode>
  );
}
