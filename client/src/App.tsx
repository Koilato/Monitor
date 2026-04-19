import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { MapDebugPanel } from './components/MapDebugPanel';
import { MapViewport } from './components/MapViewport';
import { useMapDebugSettings } from './hooks/useMapDebugSettings';
import { useMapDataSync } from './hooks/useMapDataSync';
import { useLatestContent } from './hooks/useLatestContent';

function formatUtcClock(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
    .format(date)
    .replace(',', '')
    .replace(/\//g, '-');
}

export default function App() {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [clock, setClock] = useState(() => formatUtcClock(new Date()));
  const {
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled,
    settings: debugSettings,
    resetSettings,
    updateViewportPadding,
    updateTwoDSettings,
    updateThreeDSettings,
  } = useMapDebugSettings();
  const {
    dateRange,
    setDateRange,
    hoveredCountry,
    popupAnchor,
    hoverData,
    loading,
    error,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  } = useMapDataSync();
  const {
    data: latestContent,
    loading: latestLoading,
    error: latestError,
  } = useLatestContent('sql', 5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div id="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">WORLD MONITOR</span>
          <div className="header-status">
            <span className={`status-dot ${statusTone}`} />
            <span className="status-label">{statusLabel}</span>
          </div>
        </div>
        <div className="header-center">
          <span className="header-banner">GLOBAL INCIDENT FLOW MAP</span>
        </div>
        <div className="header-right">
          <span className="header-meta">API / MOCK / ISO2</span>
        </div>
      </header>

      <main className="main-content">
        <section className="map-section">
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="panel-title">Attack Flow Map</span>
              <span className="panel-count">{panelCount}</span>
            </div>
            <div className="header-clock">{clock} UTC</div>
            <Toolbar
              viewMode={viewMode}
              dateRange={dateRange}
              onViewModeChange={setViewMode}
              onDateRangeChange={setDateRange}
            />
          </div>

          <MapViewport
            viewMode={viewMode}
            hoveredCountry={hoveredCountry}
            data={hoverData}
            loading={loading}
            error={error}
            anchor={popupAnchor}
            onCountryHover={handleCountryHover}
            debugSettings={debugSettings}
          />

          <MapDebugPanel
            open={panelOpen}
            persistEnabled={persistEnabled}
            settings={debugSettings}
            onToggleOpen={() => setPanelOpen(!panelOpen)}
            onPersistChange={setPersistEnabled}
            onReset={resetSettings}
            onViewportPaddingChange={updateViewportPadding}
            onTwoDChange={updateTwoDSettings}
            onThreeDChange={updateThreeDSettings}
          />
        </section>

        <section className="latest-section">
          <div className="latest-header">
            <div className="latest-header-left">
              <span className="latest-title">Latest SQL Feed</span>
              <span className="latest-subtitle">category / newest rows</span>
            </div>
            <div className="latest-header-right">
              {latestContent ? `${latestContent.total} rows` : 'LIVE FEED'}
            </div>
          </div>

          <div className="latest-list">
            {latestLoading ? (
              <div className="latest-empty">Loading latest content...</div>
            ) : latestError ? (
              <div className="latest-empty latest-empty--error">{latestError}</div>
            ) : latestContent && latestContent.items.length > 0 ? (
              latestContent.items.map((item, index) => {
                const rank = latestContent.offset + index + 1;

                return (
                  <article key={item.id} className="latest-card">
                    <div className="latest-card-top">
                      <span className="latest-rank">#{rank}</span>
                      <span className="latest-pill">{item.category}</span>
                      <span className="latest-time">
                        {new Intl.DateTimeFormat('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                          timeZone: 'UTC',
                        }).format(new Date(item.createdAt))}
                        {' '}
                        UTC
                      </span>
                    </div>
                    <h3 className="latest-card-title">{item.title}</h3>
                    <p className="latest-card-summary">{item.summary}</p>
                  </article>
                );
              })
            ) : (
              <div className="latest-empty">No content matched the current category.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
