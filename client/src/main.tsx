import React from 'react';
import ReactDOM from 'react-dom/client';
import AppEntry from 'shell/app-entry';
import 'maplibre-gl/dist/maplibre-gl.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppEntry />
  </React.StrictMode>,
);
