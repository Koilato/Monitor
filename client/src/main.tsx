import React from 'react';
import ReactDOM from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'shared/styles/theme.css';
import AppEntry from 'shell/app-entry';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppEntry />
  </React.StrictMode>,
);
