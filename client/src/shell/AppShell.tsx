import { useEffect, useState } from 'react';
import { LatestFeedSection } from 'content/components/LatestFeedSection';
import { MapViewport } from 'map/components/MapViewport';
import { useMapDataSync } from 'map/hooks/useMapDataSync';
import { useMapDebugSettings } from 'map/hooks/useMapDebugSettings';
import { useMapUrlState } from 'map/hooks/useMapUrlState';
import { ThreatIntelPanel } from 'shell/components/ThreatIntelPanel';
import { ThreatTickerPanel } from 'shell/components/ThreatTickerPanel';
import { useWorkspaceLayout } from 'shell/hooks/useWorkspaceLayout';
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
    updateActiveCountryCodes,
  } = useMapDebugSettings();
  const {
    appShellRef,
    workspaceRef,
    latestSectionRef,
    handleOuterDividerMouseDown,
    handleLeftDividerMouseDown,
    handleRightDividerMouseDown,
  } = useWorkspaceLayout(debugSettings.latestSectionHeight, updateLatestSectionHeight);
  const {
    state: mapState,
    setView,
    setCamera,
    setTimeFilter,
    setFlowMode,
    setFlowPlaybackMode,
    setActiveLayerIds,
  } = useMapUrlState();
  const {
    hoveredCountry,
    popupAnchor,
    hoverData,
    allFlowData,
    threatData,
    loading,
    error,
    panelCount,
    statusTone,
    statusLabel,
    handleCountryHover,
  } = useMapDataSync({
    timeFilter: mapState.timeFilter,
    flowMode: mapState.flowMode,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div id="app" className="app-shell" ref={appShellRef}>
      <main className="main-content">
        <div className="panel-header">
          <div className="panel-header-left">
            <span className="panel-title">Global Signal Map</span>
            <span className="panel-count">{panelCount}</span>
          </div>
          <div className="header-clock">{clock} UTC</div>
            <AppToolbar
              viewMode={mapState.view}
              timeFilter={mapState.timeFilter}
              flowMode={mapState.flowMode}
              flowPlaybackMode={mapState.flowPlaybackMode}
              debugModeEnabled={debugModeEnabled}
              statusTone={statusTone}
              statusLabel={statusLabel}
              onViewModeChange={setView}
              onTimeFilterChange={setTimeFilter}
              onFlowModeChange={setFlowMode}
              onFlowPlaybackModeChange={setFlowPlaybackMode}
              onDebugModeToggle={() => setDebugModeEnabled(!debugModeEnabled)}
            />
        </div>

        <div className="workspace-grid" ref={workspaceRef}>
          <section className="workspace-column workspace-column--left">
            <div className="workspace-pane workspace-pane--blank workspace-pane--left-top">
              <ThreatIntelPanel />
            </div>
            <div
              className="split-divider split-divider--horizontal"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize left panels"
              onMouseDown={handleLeftDividerMouseDown}
            />
            <div
              className="workspace-pane workspace-pane--blank workspace-pane--left-bottom"
            >
              <ThreatTickerPanel />
            </div>
          </section>

          <div
            className="split-divider split-divider--vertical"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize columns"
            onMouseDown={handleOuterDividerMouseDown}
          />

          <section
            className="workspace-column workspace-column--right"
          >
            <div className="workspace-pane workspace-pane--map">
              <MapViewport
                viewMode={mapState.view}
                mapState={mapState}
                hoveredCountry={hoveredCountry}
                hoverData={hoverData}
                flowData={mapState.flowMode === 'allflow' ? allFlowData : hoverData}
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
                  onActiveCountryCodesChange={updateActiveCountryCodes}
                />
              ) : null}
            </div>

            <div
              className="split-divider split-divider--horizontal"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize map and latest feed"
              onMouseDown={handleRightDividerMouseDown}
            />

            <LatestFeedSection
              sectionRef={latestSectionRef}
              category="sql"
              limit={5}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
