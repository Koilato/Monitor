import { useEffect, useRef, useState } from 'react';
import { LatestFeedSection } from 'content/components/LatestFeedSection';
import { MapViewport } from 'map/components/MapViewport';
import { useMapDataSync } from 'map/hooks/useMapDataSync';
import { useMapDebugSettings } from 'map/hooks/useMapDebugSettings';
import { useMapUrlState } from 'map/hooks/useMapUrlState';
import { MapDebugPanel } from 'shell/panels/MapDebugPanel';
import { AppToolbar } from 'shell/toolbar/AppToolbar';

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

export function AppShell() {
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
    updateMapSettings,
  } = useMapDebugSettings();
  const {
    state: mapState,
    setView,
    setCamera,
    setTimeFilter,
    setActiveLayerIds,
  } = useMapUrlState();
  const {
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
  } = useMapDataSync({
    timeFilter: mapState.timeFilter,
  });
  const latestSectionHeightRef = useRef(220);
  const updateLatestSectionHeightRef = useRef(updateLatestSectionHeight);
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
              <span className="panel-title">Global Signal Map</span>
              <span className="panel-count">{panelCount}</span>
            </div>
            <div className="header-clock">{clock} UTC</div>
            <AppToolbar
              viewMode={mapState.view}
              timeFilter={mapState.timeFilter}
              debugModeEnabled={debugModeEnabled}
              statusTone={statusTone}
              statusLabel={statusLabel}
              onViewModeChange={setView}
              onTimeFilterChange={setTimeFilter}
              onDebugModeToggle={() => setDebugModeEnabled(!debugModeEnabled)}
            />
          </div>

          <MapViewport
            viewMode={mapState.view}
            mapState={mapState}
            hoveredCountry={hoveredCountry}
            data={hoverData}
            threatData={threatData}
            loading={loading}
            error={error}
            anchor={popupAnchor}
            onCountryHover={handleCountryHover}
            onCameraChange={setCamera}
            onActiveLayerIdsChange={setActiveLayerIds}
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
              onMapSettingsChange={updateMapSettings}
            />
          ) : null}
        </section>

        <LatestFeedSection
          sectionRef={latestSectionRef}
          height={debugSettings.latestSectionHeight}
          category="sql"
          limit={5}
        />
      </main>
    </div>
  );
}
