import { useEffect, useRef, useState } from 'react';
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
  const mainContentRef = useRef<HTMLElement | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const latestSectionRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const {
    debugModeEnabled,
    setDebugModeEnabled,
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled,
    settings: debugSettings,
    resetSettings,
    updateLatestSectionHeight,
    updateTwoDSettings,
    updateThreeDSettings,
  } = useMapDebugSettings();
  const {
    dateRange,
    setDateRange,
    hoveredCountry,
    popupAnchor,
    hoverData,
    threatData,
    loading,
    error,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  } = useMapDataSync();
  const latestSectionHeightRef = useRef(220);
  const updateLatestSectionHeightRef = useRef(updateLatestSectionHeight);
  const {
    data: latestContent,
    loading: latestLoading,
    error: latestError,
  } = useLatestContent('sql', 5);

  useEffect(() => {
    latestSectionHeightRef.current = debugSettings.latestSectionHeight;
  }, [debugSettings.latestSectionHeight]);

  useEffect(() => {
    updateLatestSectionHeightRef.current = updateLatestSectionHeight;
  }, [updateLatestSectionHeight]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const beginResizeDrag = (clientY: number) => {
    const mainContent = mainContentRef.current;
    if (!mainContent) {
      return;
    }

    const bounds = mainContent.getBoundingClientRect();
    const minLatestHeight = 140;
    const maxLatestHeight = Math.max(minLatestHeight, bounds.height - 180);
    const currentHeight = Math.min(
      Math.max(latestSectionHeightRef.current, minLatestHeight),
      maxLatestHeight,
    );

    dragStateRef.current = {
      startY: clientY,
      startHeight: currentHeight,
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const dragState = dragStateRef.current;
      const content = mainContentRef.current;

      if (!dragState || !content) {
        return;
      }

      moveEvent.preventDefault();

      const rect = content.getBoundingClientRect();
      const minHeight = 140;
      const maxHeight = Math.max(minHeight, rect.height - 180);
      const deltaY = moveEvent.clientY - dragState.startY;
      const nextHeight = Math.min(
        Math.max(dragState.startHeight - deltaY, minHeight),
        maxHeight,
      );

      updateLatestSectionHeightRef.current(nextHeight);
    };

    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  useEffect(() => {
    const handleGlobalMouseDown = (event: MouseEvent) => {
      const mainContent = mainContentRef.current;
      const mapSection = mapSectionRef.current;
      const latestSection = latestSectionRef.current;

      if (!mainContent || !mapSection || !latestSection) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const threshold = 16;
      const mapRect = mapSection.getBoundingClientRect();
      const latestRect = latestSection.getBoundingClientRect();
      const boundaryY = (mapRect.bottom + latestRect.top) / 2;
      const isBoundaryHit = Math.abs(event.clientY - boundaryY) <= threshold;

      if (!isBoundaryHit) {
        return;
      }

      event.preventDefault();
      beginResizeDrag(event.clientY);
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
    };
  }, []);

  return (
    <div id="app">
      <main className="main-content" ref={mainContentRef}>
        <section className="map-section" ref={mapSectionRef}>
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="panel-title">Attack Flow Map</span>
              <span className="panel-count">{panelCount}</span>
            </div>
            <div className="header-clock">{clock} UTC</div>
            <Toolbar
              viewMode={viewMode}
              dateRange={dateRange}
              debugModeEnabled={debugModeEnabled}
              statusTone={statusTone}
              statusLabel={statusLabel}
              onViewModeChange={setViewMode}
              onDateRangeChange={setDateRange}
              onDebugModeToggle={() => setDebugModeEnabled(!debugModeEnabled)}
            />
          </div>

          <MapViewport
            viewMode={viewMode}
            hoveredCountry={hoveredCountry}
            data={hoverData}
            threatData={threatData}
            loading={loading}
            error={error}
            anchor={popupAnchor}
            onCountryHover={handleCountryHover}
            debugSettings={debugSettings}
          />

          {debugModeEnabled ? (
            <MapDebugPanel
              open={panelOpen}
              persistEnabled={persistEnabled}
              settings={debugSettings}
              onToggleOpen={() => setPanelOpen(!panelOpen)}
              onPersistChange={setPersistEnabled}
              onReset={resetSettings}
              onLatestSectionHeightChange={updateLatestSectionHeight}
              onTwoDChange={updateTwoDSettings}
              onThreeDChange={updateThreeDSettings}
            />
          ) : null}
        </section>

        <section
          className="latest-section"
          ref={latestSectionRef}
          style={{ flexBasis: `${debugSettings.latestSectionHeight}px` }}
        >
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
