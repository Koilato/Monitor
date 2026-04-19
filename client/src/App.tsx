import { useEffect, useRef, useState } from 'react';
import type { CountryHoverResponse, DateRange } from '@shared/types';
import { fetchCountryHover } from './lib/api';
import type { CountryHoverEvent, HoverCountryState, PopupAnchor } from './lib/types';
import { Toolbar } from './components/Toolbar';
import { IncidentPopup } from './components/IncidentPopup';
import { TwoDMap } from './components/TwoDMap';
import { Globe3DMap } from './components/Globe3DMap';

const DEFAULT_DATE_RANGE: DateRange = {
  startDate: null,
  endDate: null,
};

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
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [hoveredCountry, setHoveredCountry] = useState<HoverCountryState | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const [hoverData, setHoverData] = useState<CountryHoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => formatUtcClock(new Date()));
  const requestRef = useRef<AbortController | null>(null);
  const currentCountryRef = useRef<string | null>(null);
  const latestRangeRef = useRef<DateRange>(dateRange);

  useEffect(() => {
    latestRangeRef.current = dateRange;
  }, [dateRange]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatUtcClock(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleCountryHover = async (event: CountryHoverEvent) => {
    setPopupAnchor(event.anchor);

    if (!event.country) {
      currentCountryRef.current = null;
      requestRef.current?.abort();
      requestRef.current = null;
      setHoveredCountry(null);
      setHoverData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setHoveredCountry(event.country);

    if (currentCountryRef.current === event.country.code) {
      return;
    }

    currentCountryRef.current = event.country.code;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchCountryHover(event.country.code, latestRangeRef.current, controller.signal);
      if (!controller.signal.aborted) {
        setHoverData(response);
      }
    } catch (fetchError) {
      if ((fetchError as Error).name === 'AbortError') {
        return;
      }
      setHoverData(null);
      setError((fetchError as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const statusTone = error ? 'error' : loading ? 'warning' : 'live';
  const statusLabel = error
    ? 'QUERY ERROR'
    : loading
      ? 'QUERYING'
      : hoveredCountry
        ? `TRACKING ${hoveredCountry.code}`
        : 'LIVE MOCK FEED';
  const panelCount = hoveredCountry ? hoverData?.total ?? 0 : 0;

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

          <div className={`map-container ${viewMode === '2d' ? 'deckgl-mode' : 'globe-mode'}`}>
            {viewMode === '2d' ? (
              <TwoDMap
                hoveredCountryCode={hoveredCountry?.code ?? null}
                data={hoverData}
                onCountryHover={handleCountryHover}
              />
            ) : (
              <Globe3DMap
                hoveredCountryCode={hoveredCountry?.code ?? null}
                data={hoverData}
                onCountryHover={handleCountryHover}
              />
            )}

            <IncidentPopup
              country={hoveredCountry}
              data={hoverData}
              anchor={popupAnchor}
              loading={loading}
              error={error}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
