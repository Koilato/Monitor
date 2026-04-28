import { useEffect, useRef, useState } from 'react';
import type { ThreatIntelItem, ThreatIntelSortOrder } from '@shared/types';
import { formatThreatIntelStatus, formatThreatIntelTimestamp } from 'shell/lib/threat-intel';

const toneLabelMap: Record<ThreatIntelItem['tone'], string> = {
  critical: '严重',
  warning: '告警',
  info: '情报',
};

function ThreatIntelCard(props: { item: ThreatIntelItem }) {
  const { item } = props;

  return (
    <article className={`intel-card intel-card--${item.tone}`}>
      <div className="intel-card-top">
        <span className="intel-pill">{item.level}</span>
        <span className="intel-time">{formatThreatIntelTimestamp(item.occurredAt)}</span>
      </div>

      <div className="intel-meta">
        <div className="intel-block">
          <span className="intel-label">受害者</span>
          <strong className="intel-value">{item.victim}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">攻击方</span>
          <strong className={`intel-value intel-value--${item.tone}`}>{item.attacker}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">来源</span>
          <strong className="intel-value">{item.source}</strong>
        </div>

        <div className="intel-block">
          <span className="intel-label">目标地址</span>
          <strong className="intel-value">{item.address}</strong>
        </div>
      </div>
    </article>
  );
}

interface ThreatIntelPanelProps {
  items: ThreatIntelItem[];
  loading: boolean;
  error: string | null;
  sortOrder: ThreatIntelSortOrder;
  onSortOrderChange: (sortOrder: ThreatIntelSortOrder) => void;
  refreshEnabled: boolean;
  onRefreshEnabledChange: (enabled: boolean) => void;
  lastUpdatedAt: string | null;
}

function formatLastUpdatedAt(value: string | null): string {
  if (!value) {
    return '待刷新';
  }

  return formatThreatIntelTimestamp(value);
}

export function ThreatIntelPanel(props: ThreatIntelPanelProps) {
  const {
    items,
    loading,
    error,
    sortOrder,
    onSortOrderChange,
    refreshEnabled,
    onRefreshEnabledChange,
    lastUpdatedAt,
  } = props;
  const listRef = useRef<HTMLDivElement | null>(null);
  const autoScrollTimerRef = useRef<number | null>(null);
  const userPauseTimerRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userScrollPaused, setUserScrollPaused] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }

    const updateOverflow = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight + 1);
    };

    updateOverflow();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateOverflow)
      : null;

    resizeObserver?.observe(el);
    window.addEventListener('resize', updateOverflow);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOverflow);
    };
  }, [items, loading, error]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }

    if (userPauseTimerRef.current != null) {
      window.clearTimeout(userPauseTimerRef.current);
      userPauseTimerRef.current = null;
    }
    programmaticScrollRef.current = true;
    el.scrollTop = 0;
    setUserScrollPaused(false);
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  }, [items, sortOrder, autoScrollEnabled]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !autoScrollEnabled || !hasOverflow) {
      return;
    }

    if (hoverPaused || userScrollPaused) {
      return;
    }

    let cancelled = false;
    let lastFrame = window.performance.now();

    const step = (now: number) => {
      if (cancelled) {
        return;
      }

      if (hoverPaused || userScrollPaused) {
        lastFrame = now;
        autoScrollTimerRef.current = window.requestAnimationFrame(step);
        return;
      }

      const delta = now - lastFrame;
      lastFrame = now;
      const speedPerMs = 0.028;
      const nextScrollTop = el.scrollTop + (delta * speedPerMs);
      const maxScrollTop = el.scrollHeight - el.clientHeight;

      programmaticScrollRef.current = true;
      if (nextScrollTop >= maxScrollTop - 1) {
        el.scrollTop = 0;
      } else {
        el.scrollTop = nextScrollTop;
      }
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 0);

      autoScrollTimerRef.current = window.requestAnimationFrame(step);
    };

    autoScrollTimerRef.current = window.requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (autoScrollTimerRef.current != null) {
        window.cancelAnimationFrame(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
      programmaticScrollRef.current = false;
    };
  }, [autoScrollEnabled, hasOverflow, hoverPaused, userScrollPaused, items, sortOrder]);

  useEffect(() => () => {
    if (userPauseTimerRef.current != null) {
      window.clearTimeout(userPauseTimerRef.current);
    }
    if (autoScrollTimerRef.current != null) {
      window.cancelAnimationFrame(autoScrollTimerRef.current);
    }
  }, []);

  const handleListScroll = () => {
    if (!autoScrollEnabled || programmaticScrollRef.current) {
      return;
    }

    if (userPauseTimerRef.current != null) {
      window.clearTimeout(userPauseTimerRef.current);
    }

    setUserScrollPaused(true);
    userPauseTimerRef.current = window.setTimeout(() => {
      setUserScrollPaused(false);
    }, 1200);
  };

  const statusText = formatThreatIntelStatus({
    total: items.length,
    sortOrder,
    autoScrollEnabled,
    refreshEnabled,
    loading,
  });
  const lastUpdatedLabel = formatLastUpdatedAt(lastUpdatedAt);

  return (
    <section className="intel-panel">
      <header className="intel-panel-header">
        <div className="intel-panel-heading">
          <span className="intel-panel-title">威胁观察列表</span>
          <span className="intel-panel-subtitle">真实接口 / 左上面板</span>
        </div>
        <div className="intel-panel-header-meta">
          <span className="intel-panel-status">{statusText}</span>
          <span className="intel-panel-updated">更新 {lastUpdatedLabel}</span>
        </div>
      </header>

      <div className="intel-panel-controls" role="group" aria-label="威胁列表控制">
        <div className="intel-toggle-group" role="group" aria-label="排序切换">
          <button
            type="button"
            className={`intel-toggle-btn ${sortOrder === 'asc' ? 'active' : ''}`}
            aria-pressed={sortOrder === 'asc'}
            onClick={() => onSortOrderChange('asc')}
            title="按发生时间从早到晚显示"
          >
            正序
          </button>
          <button
            type="button"
            className={`intel-toggle-btn ${sortOrder === 'desc' ? 'active' : ''}`}
            aria-pressed={sortOrder === 'desc'}
            onClick={() => onSortOrderChange('desc')}
            title="按发生时间从晚到早显示"
          >
            倒序
          </button>
        </div>

        <button
          type="button"
          className={`intel-switch-btn ${autoScrollEnabled ? 'active' : ''}`}
          aria-pressed={autoScrollEnabled}
          onClick={() => setAutoScrollEnabled((value) => !value)}
        >
          自动滚动 {autoScrollEnabled ? '开' : '关'}
        </button>

        <button
          type="button"
          className={`intel-switch-btn ${refreshEnabled ? 'active' : ''}`}
          aria-pressed={refreshEnabled}
          onClick={() => onRefreshEnabledChange(!refreshEnabled)}
        >
          定时刷新 {refreshEnabled ? '开' : '关'}
        </button>
      </div>

      <div
        ref={listRef}
        className={`intel-list${autoScrollEnabled ? ' intel-list--auto' : ''}`}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onScroll={handleListScroll}
      >
        {loading && items.length === 0 ? (
          <div className="intel-empty">正在加载威胁列表...</div>
        ) : error ? (
          <div className="intel-empty intel-empty--error">{error}</div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <ThreatIntelCard key={item.id} item={item} />
          ))
        ) : (
          <div className="intel-empty">当前没有威胁事件。</div>
        )}
      </div>

      <footer className="intel-panel-footer">
        {Object.entries(toneLabelMap).map(([tone, label]) => (
          <span key={tone} className={`intel-legend intel-legend--${tone}`}>
            {label}
          </span>
        ))}
      </footer>
    </section>
  );
}
