import { useEffect, useState } from 'react';
import { MapViewport } from 'map/components/MapViewport';
import { useMapDataSync } from 'map/hooks/useMapDataSync';
import { ThreatIntelPanel } from 'shell/components/ThreatIntelPanel';
import { ThreatTickerPanel } from 'shell/components/ThreatTickerPanel';
import { TrafficStatsSection } from 'shell/components/TrafficStatsSection';
import { useThreatIntelFeed } from 'shell/hooks/useThreatIntelFeed';
import { useWorkspaceLayout } from 'shell/hooks/useWorkspaceLayout';
import { useMapDebugSettings } from 'map/hooks/useMapDebugSettings';
import { useMapUrlState } from 'map/hooks/useMapUrlState';
import { MapDebugPanel } from 'shell/panels/MapDebugPanel';
import { AppToolbar } from 'shell/toolbar/AppToolbar';

function formatUtcClock(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
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

function HeaderClock() {
  const [clock, setClock] = useState(() => formatUtcClock(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return <div className="header-clock">{clock} </div>;
}

export function AppShell() {
  const {
    debugModeEnabled,
    setDebugModeEnabled,
    panelOpen,
    setPanelOpen,
    persistEnabled,
    setPersistEnabled,
    settings: debugSettings,
    attackArcConfigState,
    resetSettings,
    updateLatestSectionHeight,
    updateMapSettings,
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
    setCamera,
    setTimeFilter,
    setShowAttackArcs,
    setFlowPlaybackMode,
  } = useMapUrlState();
  const {
    selectedCountry,
    selectedAnchor,
    countryData,
    allFlowData,
    allFlowLoading,
    allFlowError,
    threatData,
    threatLoading,
    threatError,
    trendData,
    ransomwareKpis,
    trendLoading,
    trendError,
    ransomwareKpisLoading,
    ransomwareKpisError,
    loading,
    error,
    panelCount,
    statusTone,
    statusLabel,
    handleCountrySelect,
  } = useMapDataSync({
    timeFilter: mapState.timeFilter,
    showAttackArcs: mapState.showAttackArcs,
  });
  const threatIntelFeed = useThreatIntelFeed({
    limit: 30,
    refreshIntervalMs: 15000,
    initialSortOrder: 'desc',
  });

  return (
    <div id="app" className="app-shell" ref={appShellRef}>
      <main className="main-content">
        <div className="panel-header">
          <div className="panel-header-left">
            <span className="panel-title">全球信号地图</span>
            <span className="panel-count">{panelCount}</span>
          </div>
          <HeaderClock />
          <AppToolbar
            timeFilter={mapState.timeFilter}
            showAttackArcs={mapState.showAttackArcs}
            flowPlaybackMode={mapState.flowPlaybackMode}
            debugModeEnabled={debugModeEnabled}
            statusTone={statusTone}
            statusLabel={statusLabel}
            onTimeFilterChange={setTimeFilter}
            onShowAttackArcsChange={setShowAttackArcs}
            onFlowPlaybackModeChange={setFlowPlaybackMode}
            onDebugModeToggle={() => setDebugModeEnabled(!debugModeEnabled)}
          />
        </div>

        <div className="workspace-grid" ref={workspaceRef}>
          <section className="workspace-column workspace-column--left">
            <div className="workspace-pane workspace-pane--blank workspace-pane--left-top">
              <ThreatIntelPanel
                items={threatIntelFeed.data?.items ?? []}
                loading={threatIntelFeed.loading}
                error={threatIntelFeed.error}
                sortOrder={threatIntelFeed.sortOrder}
                onSortOrderChange={threatIntelFeed.setSortOrder}
                refreshEnabled={threatIntelFeed.refreshEnabled}
                onRefreshEnabledChange={threatIntelFeed.setRefreshEnabled}
                lastUpdatedAt={threatIntelFeed.lastUpdatedAt}
              />
            </div>
            <div
              className="split-divider split-divider--horizontal"
              role="separator"
              aria-orientation="horizontal"
              aria-label="调整左侧面板大小"
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
            aria-label="调整左右栏大小"
            onMouseDown={handleOuterDividerMouseDown}
          />

          <section
            className="workspace-column workspace-column--right"
          >
            <div className="workspace-pane workspace-pane--map">
              <MapViewport
                mapState={mapState}
                selectedCountry={selectedCountry}
                countryData={countryData}
                flowData={allFlowData}
                threatData={threatData}
                loading={loading}
                error={error}
                anchor={selectedAnchor}
                onCountrySelect={handleCountrySelect}
                onCameraChange={setCamera}
                debugSettings={debugSettings}
              />

              {debugModeEnabled ? (
                <MapDebugPanel
                  open={panelOpen}
                  persistEnabled={persistEnabled}
                  settings={debugSettings}
                  attackArcConfigState={attackArcConfigState}
                  onToggleOpen={() => setPanelOpen(!panelOpen)}
                  onPersistChange={setPersistEnabled}
                  onReset={resetSettings}
                  onLatestSectionHeightChange={updateLatestSectionHeight}
                  onMapSettingsChange={updateMapSettings}
                />
              ) : null}
            </div>

            <div
              className="split-divider split-divider--horizontal"
              role="separator"
              aria-orientation="horizontal"
              aria-label="调整地图和数据看板大小"
              onMouseDown={handleRightDividerMouseDown}
            />

            <TrafficStatsSection
              sectionRef={latestSectionRef}
              data={allFlowData}
              threatData={threatData}
              threatLoading={threatLoading}
              threatError={threatError}
              trendData={trendData}
              ransomwareKpis={ransomwareKpis}
              loading={allFlowLoading}
              error={allFlowError}
              trendLoading={trendLoading}
              trendError={trendError}
              ransomwareKpisLoading={ransomwareKpisLoading}
              ransomwareKpisError={ransomwareKpisError}
              settings={debugSettings.trafficStats}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
