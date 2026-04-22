import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { LatestFeedSection } from 'content/components/LatestFeedSection';
import { MapViewport } from 'map/components/MapViewport';
import { useMapDataSync } from 'map/hooks/useMapDataSync';
import { useMapDebugSettings } from 'map/hooks/useMapDebugSettings';
import { useMapUrlState } from 'map/hooks/useMapUrlState';
import { MapDebugPanel } from 'shell/panels/MapDebugPanel';
import { clampSize, resolveDraggedSplitSize } from 'shell/lib/split-size';
import { AppToolbar } from 'shell/toolbar/AppToolbar';

const OUTER_DIVIDER_SIZE = 8;
const INNER_DIVIDER_SIZE = 8;
const MIN_LEFT_COLUMN_WIDTH = 300;
const MIN_RIGHT_COLUMN_WIDTH = 480;
const MIN_TOP_PANEL_HEIGHT = 180;
const MIN_BOTTOM_PANEL_HEIGHT = 120;
const DEFAULT_LEFT_BOTTOM_HEIGHT = 180;
const DEFAULT_RIGHT_COLUMN_WIDTH = 720;

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

function getInitialRightColumnWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_RIGHT_COLUMN_WIDTH;
  }

  return Math.round(window.innerWidth * 0.66);
}

export function AppShell() {
  const [clock, setClock] = useState(() => formatUtcClock(new Date()));
  const [rightColumnWidth, setRightColumnWidth] = useState(() => getInitialRightColumnWidth());
  const [leftBottomHeight, setLeftBottomHeight] = useState(DEFAULT_LEFT_BOTTOM_HEIGHT);
  const [workspaceBounds, setWorkspaceBounds] = useState({ width: 0, height: 0 });
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const latestSectionRef = useRef<HTMLElement | null>(null);
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
  const hasWorkspaceBounds = workspaceBounds.width > 0 && workspaceBounds.height > 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateBounds = () => {
      const rect = element.getBoundingClientRect();
      const nextBounds = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      setWorkspaceBounds((current) => (
        current.width === nextBounds.width && current.height === nextBounds.height
          ? current
          : nextBounds
      ));
    };

    updateBounds();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBounds);
      return () => window.removeEventListener('resize', updateBounds);
    }

    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);
    window.addEventListener('resize', updateBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  const maxRightColumnWidth = hasWorkspaceBounds
    ? Math.max(
      MIN_RIGHT_COLUMN_WIDTH,
      workspaceBounds.width - MIN_LEFT_COLUMN_WIDTH - OUTER_DIVIDER_SIZE,
    )
    : rightColumnWidth;
  const maxBottomPanelHeight = hasWorkspaceBounds
    ? Math.max(
      MIN_BOTTOM_PANEL_HEIGHT,
      workspaceBounds.height - MIN_TOP_PANEL_HEIGHT - INNER_DIVIDER_SIZE,
    )
    : leftBottomHeight;
  const clampedRightColumnWidth = hasWorkspaceBounds
    ? clampSize(
      rightColumnWidth,
      MIN_RIGHT_COLUMN_WIDTH,
      maxRightColumnWidth,
    )
    : rightColumnWidth;
  const clampedLeftBottomHeight = hasWorkspaceBounds
    ? clampSize(
      leftBottomHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      maxBottomPanelHeight,
    )
    : leftBottomHeight;
  const clampedLatestSectionHeight = hasWorkspaceBounds
    ? clampSize(
      debugSettings.latestSectionHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      maxBottomPanelHeight,
    )
    : debugSettings.latestSectionHeight;

  useEffect(() => {
    if (!hasWorkspaceBounds) {
      return;
    }

    setRightColumnWidth((current) => {
      const next = clampSize(current, MIN_RIGHT_COLUMN_WIDTH, maxRightColumnWidth);
      return next === current ? current : next;
    });
    setLeftBottomHeight((current) => {
      const next = clampSize(current, MIN_BOTTOM_PANEL_HEIGHT, maxBottomPanelHeight);
      return next === current ? current : next;
    });

    if (clampedLatestSectionHeight !== debugSettings.latestSectionHeight) {
      updateLatestSectionHeight(clampedLatestSectionHeight);
    }
  }, [
    clampedLatestSectionHeight,
    debugSettings.latestSectionHeight,
    hasWorkspaceBounds,
    maxBottomPanelHeight,
    maxRightColumnWidth,
    updateLatestSectionHeight,
  ]);

  const beginResizeDrag = (
    axis: 'x' | 'y',
    startSize: number,
    minSize: number,
    maxSize: number,
    startClientPosition: number,
    onResize: (size: number) => void,
  ) => {
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      const delta = axis === 'x'
        ? moveEvent.clientX - startClientPosition
        : moveEvent.clientY - startClientPosition;

      onResize(resolveDraggedSplitSize({
        startSize,
        delta,
        minSize,
        maxSize,
      }));
    };

    const handlePointerUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleOuterDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    beginResizeDrag(
      'x',
      clampedRightColumnWidth,
      MIN_RIGHT_COLUMN_WIDTH,
      maxRightColumnWidth,
      event.clientX,
      setRightColumnWidth,
    );
  };

  const handleLeftDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    beginResizeDrag(
      'y',
      clampedLeftBottomHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      maxBottomPanelHeight,
      event.clientY,
      setLeftBottomHeight,
    );
  };

  const handleRightDividerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    beginResizeDrag(
      'y',
      clampedLatestSectionHeight,
      MIN_BOTTOM_PANEL_HEIGHT,
      maxBottomPanelHeight,
      event.clientY,
      updateLatestSectionHeight,
    );
  };

  return (
    <div id="app">
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
            debugModeEnabled={debugModeEnabled}
            statusTone={statusTone}
            statusLabel={statusLabel}
            onViewModeChange={setView}
            onTimeFilterChange={setTimeFilter}
            onDebugModeToggle={() => setDebugModeEnabled(!debugModeEnabled)}
          />
        </div>

        <div className="workspace-grid" ref={workspaceRef}>
          <section className="workspace-column workspace-column--left">
            <div className="workspace-pane workspace-pane--blank workspace-pane--left-top" />
            <div
              className="split-divider split-divider--horizontal"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize left panels"
              onMouseDown={handleLeftDividerMouseDown}
            />
            <div
              className="workspace-pane workspace-pane--blank workspace-pane--left-bottom"
              style={{ flexBasis: `${clampedLeftBottomHeight}px` }}
            />
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
            style={{ width: `${clampedRightColumnWidth}px` }}
          >
            <div className="workspace-pane workspace-pane--map">
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
              height={clampedLatestSectionHeight}
              category="sql"
              limit={5}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
