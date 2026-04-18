import { useState, useEffect, useRef, useCallback } from 'react';

const PANEL_COLLAPSED_KEY = 'worldmonitor-panel-collapsed';

function loadCollapsed(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PANEL_COLLAPSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(panelId: string, collapsed: boolean): void {
  const map = loadCollapsed();
  if (collapsed) {
    map[panelId] = true;
  } else {
    delete map[panelId];
  }
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(PANEL_COLLAPSED_KEY);
  } else {
    localStorage.setItem(PANEL_COLLAPSED_KEY, JSON.stringify(map));
  }
}

export interface UsePanelOptions {
  id: string;
  title: string;
  infoTooltip?: string;
  defaultCollapsed?: boolean;
}

export interface UsePanelReturn {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  toggleCollapsed: () => void;
  count: number | undefined;
  setCount: (n: number | undefined) => void;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none' | undefined;
  setSeverity: (s: 'critical' | 'high' | 'medium' | 'low' | 'none' | undefined) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

export function usePanel(options: UsePanelOptions): UsePanelReturn {
  const { id } = options;
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const stored = loadCollapsed();
    return stored[id] ?? options.defaultCollapsed ?? false;
  });
  const [count, setCount] = useState<number | undefined>();
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'none' | undefined>();
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setCollapsed = useCallback((c: boolean) => {
    setCollapsedState(c);
    saveCollapsed(id, c);
  }, [id]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  // IntersectionObserver for visibility detection
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    count,
    setCount,
    severity,
    setSeverity,
    contentRef,
    isVisible,
  };
}
