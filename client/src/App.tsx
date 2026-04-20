import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  const [leftColumnWidth, setLeftColumnWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 600;
    }

    return Math.max(700, Math.floor(window.innerWidth * 0.34));
  });
  const [leftSplitHeight, setLeftSplitHeight] = useState(() => {
    if (typeof window === 'undefined') {
      return 320;
    }

    return Math.max(220, Math.floor(window.innerHeight * 0.42));
  });
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const leftPanelRef = useRef<HTMLElement | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const columnDragStateRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const leftSplitStateRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const rightSplitStateRef = useRef<{
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

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const clampHeight = () => {
      const rect = panel.getBoundingClientRect();
      const minTop = 180;
      const minBottom = 180;
      const dividerHeight = 8;
      const maxTop = Math.max(minTop, rect.height - minBottom - dividerHeight);

      setLeftSplitHeight((current) => Math.min(Math.max(current, minTop), maxTop));
    };

    clampHeight();

    const observer = new ResizeObserver(clampHeight);
    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const clampHeight = () => {
      const rect = panel.getBoundingClientRect();
      const minTop = 180;
      const minBottom = 120;
      const dividerHeight = 8;
      const maxTop = Math.max(minTop, rect.height - minBottom - dividerHeight);
      const nextHeight = Math.min(
        Math.max(debugSettings.latestSectionHeight, minTop),
        maxTop,
      );

      if (nextHeight !== debugSettings.latestSectionHeight) {
        updateLatestSectionHeight(nextHeight);
      }
    };

    clampHeight();

    const observer = new ResizeObserver(clampHeight);
    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, [debugSettings.latestSectionHeight, updateLatestSectionHeight]);

  const beginLeftResizeDrag = (clientY: number) => {
    const panel = leftPanelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const minTop = 180;
    const minBottom = 180;
    const dividerHeight = 8;
    const maxTop = Math.max(minTop, rect.height - minBottom - dividerHeight);
    const currentHeight = Math.min(Math.max(leftSplitHeight, minTop), maxTop);

    leftSplitStateRef.current = {
      startY: clientY,
      startHeight: currentHeight,
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const dragState = leftSplitStateRef.current;
      const content = leftPanelRef.current;

      if (!dragState || !content) {
        return;
      }

      moveEvent.preventDefault();

      const bounds = content.getBoundingClientRect();
      const nextMaxTop = Math.max(minTop, bounds.height - minBottom - dividerHeight);
      const deltaY = moveEvent.clientY - dragState.startY;
      const nextHeight = Math.min(
        Math.max(dragState.startHeight + deltaY, minTop),
        nextMaxTop,
      );

      setLeftSplitHeight(nextHeight);
    };

    const handlePointerUp = () => {
      if (!leftSplitStateRef.current) {
        return;
      }

      leftSplitStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const beginRightResizeDrag = (clientY: number) => {
    const panel = rightPanelRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const minTop = 180;
    const minBottom = 120;
    const dividerHeight = 8;
    const maxTop = Math.max(minTop, rect.height - minBottom - dividerHeight);
    const currentHeight = Math.min(
      Math.max(debugSettings.latestSectionHeight, minTop),
      maxTop,
    );

    rightSplitStateRef.current = {
      startY: clientY,
      startHeight: currentHeight,
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const dragState = rightSplitStateRef.current;
      const content = rightPanelRef.current;

      if (!dragState || !content) {
        return;
      }

      moveEvent.preventDefault();

      const bounds = content.getBoundingClientRect();
      const nextMaxTop = Math.max(minTop, bounds.height - minBottom - dividerHeight);
      const deltaY = moveEvent.clientY - dragState.startY;
      const nextHeight = Math.min(
        Math.max(dragState.startHeight + deltaY, minTop),
        nextMaxTop,
      );

      updateLatestSectionHeight(nextHeight);
    };

    const handlePointerUp = () => {
      if (!rightSplitStateRef.current) {
        return;
      }

      rightSplitStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const beginColumnResizeDrag = (clientX: number) => {
    const panel = workspaceRef.current;
    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const minLeft = 320;
    const minRight = 420;
    const dividerWidth = 8;
    const maxLeft = Math.max(minLeft, rect.width - minRight - dividerWidth);
    const currentWidth = Math.min(Math.max(leftColumnWidth, minLeft), maxLeft);

    columnDragStateRef.current = {
      startX: clientX,
      startWidth: currentWidth,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const dragState = columnDragStateRef.current;
      const content = workspaceRef.current;

      if (!dragState || !content) {
        return;
      }

      moveEvent.preventDefault();

      const bounds = content.getBoundingClientRect();
      const nextMaxLeft = Math.max(minLeft, bounds.width - minRight - dividerWidth);
      const deltaX = moveEvent.clientX - dragState.startX;
      const nextWidth = Math.min(
        Math.max(dragState.startWidth + deltaX, minLeft),
        nextMaxLeft,
      );

      setLeftColumnWidth(nextWidth);
    };

    const handlePointerUp = () => {
      if (!columnDragStateRef.current) {
        return;
      }

      columnDragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div id="app">
      <main
        className="main-content"
        style={{
          '--latest-row-height': `${debugSettings.latestSectionHeight}px`,
          '--left-column-width': `${leftColumnWidth}px`,
          '--left-top-height': `${leftSplitHeight}px`,
          '--right-top-height': `${debugSettings.latestSectionHeight}px`,
        } as CSSProperties}
      >
        <div className="workspace-grid" ref={workspaceRef}>
          <section className="workspace-panel workspace-panel--left" ref={leftPanelRef}>
            <div className="workspace-panel__pane workspace-panel__pane--top" />

            <div
              className="workspace-panel__split-handle"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize left panels"
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }

                event.preventDefault();
                beginLeftResizeDrag(event.clientY);
              }}
            >
              <span className="workspace-panel__split-handle-bar" />
            </div>

            <div className="workspace-panel__pane workspace-panel__pane--bottom" />
          </section>

          <div
            className="workspace-column-splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize left and right panels"
            onMouseDown={(event) => {
              if (event.button !== 0) {
                return;
              }

              event.preventDefault();
              beginColumnResizeDrag(event.clientX);
            }}
          >
            <span className="workspace-column-splitter-bar" />
          </div>

          <section className="workspace-panel workspace-panel--right" ref={rightPanelRef}>
            <div className="workspace-panel__pane workspace-panel__pane--top">
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
            </div>

            <div
              className="workspace-panel__split-handle"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize map and latest panels"
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }

                event.preventDefault();
                beginRightResizeDrag(event.clientY);
              }}
            >
              <span className="workspace-panel__split-handle-bar" />
            </div>

            <section className="latest-section workspace-panel__pane workspace-panel__pane--bottom">
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
          </section>
        </div>
      </main>
    </div>
  );
}
