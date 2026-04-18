import type { AppContext } from '@/app/app-context';
import { STORAGE_KEYS, SITE_VARIANT } from '@/config';
import { saveToStorage } from '@/utils';

export interface EventHandlerManagerCallbacks {
  updateSearchIndex: () => void;
  loadAllData: () => Promise<void>;
  flushStaleRefreshes: () => void;
  setHiddenSince: (ts: number) => void;
  loadDataForLayer: (layer: string) => Promise<void>;
  waitForAisData: () => Promise<void>;
  syncDataFreshnessWithLayers: () => void;
  ensureCorrectZones: () => void;
}

export class EventHandlerManager {
  private ctx: AppContext;
  private callbacks: EventHandlerManagerCallbacks;
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private boundHandlers: { el: EventTarget; event: string; handler: EventListener }[] = [];

  constructor(ctx: AppContext, callbacks: EventHandlerManagerCallbacks) {
    this.ctx = ctx;
    this.callbacks = callbacks;
  }

  init(): void {
    this.setupHeaderButtons();
    this.setupMobileMenu();
    this.setupRegionSelector();
    this.setupMapDimensionToggle();
    this.setupMapFullscreen();
    this.setupMapPin();
    this.setupMapResize();
    this.setupMapWidthResize();
    this.setupVisibilityHandler();
    this.setupGithubStars();
  }

  destroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    for (const { el, event, handler } of this.boundHandlers) {
      el.removeEventListener(event, handler);
    }
    this.boundHandlers = [];
  }

  startHeaderClock(): void {
    const updateClock = () => {
      const el = document.getElementById('headerClock');
      if (!el) return;
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      });
    };
    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  setupUrlStateSync(): void {
    // Simplified: URL state sync handled by map component
  }

  private bind(el: EventTarget, event: string, handler: EventListener): void {
    el.addEventListener(event, handler);
    this.boundHandlers.push({ el, event, handler });
  }

  private setupHeaderButtons(): void {
    // Hamburger menu
    const hamburger = document.getElementById('hamburgerBtn');
    const overlay = document.getElementById('mobileMenuOverlay');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeBtn = document.getElementById('mobileMenuClose');

    const openMenu = () => {
      mobileMenu?.classList.add('open');
      overlay?.classList.add('open');
    };
    const closeMenu = () => {
      mobileMenu?.classList.remove('open');
      overlay?.classList.remove('open');
    };

    if (hamburger) this.bind(hamburger, 'click', () => openMenu());
    if (overlay) this.bind(overlay, 'click', () => closeMenu());
    if (closeBtn) this.bind(closeBtn, 'click', () => closeMenu());

    // Mobile settings button
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
    if (mobileSettingsBtn) {
      this.bind(mobileSettingsBtn, 'click', () => {
        closeMenu();
      });
    }

    // Mobile theme toggle
    const mobileMenuTheme = document.getElementById('mobileMenuTheme');
    if (mobileMenuTheme) {
      this.bind(mobileMenuTheme, 'click', () => {
        closeMenu();
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
    }
  }

  private setupMobileMenu(): void {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;

    // Variant switcher items
    const variantItems = mobileMenu.querySelectorAll('.mobile-menu-variant');
    variantItems.forEach(item => {
      this.bind(item, 'click', (e) => {
        const variant = (e.currentTarget as HTMLElement).dataset.variant;
        if (variant && variant !== SITE_VARIANT) {
          const urls: Record<string, string> = {
            full: 'https://worldmonitor.app',
            tech: 'https://tech.worldmonitor.app',
            finance: 'https://finance.worldmonitor.app',
            commodity: 'https://commodity.worldmonitor.app',
            happy: 'https://happy.worldmonitor.app',
          };
          const url = urls[variant];
          if (url) {
            if (window.self !== window.top) {
              window.open(url, '_blank');
            } else {
              window.location.href = url;
            }
          }
        }
      });
    });

    // Region selector in mobile menu
    const mobileMenuRegion = document.getElementById('mobileMenuRegion');
    const regionSheetBackdrop = document.getElementById('regionSheetBackdrop');
    const regionBottomSheet = document.getElementById('regionBottomSheet');
    const regionSheetClose = () => {
      regionSheetBackdrop?.classList.remove('open');
      regionBottomSheet?.classList.remove('open');
    };

    if (mobileMenuRegion) {
      this.bind(mobileMenuRegion, 'click', () => {
        regionSheetBackdrop?.classList.add('open');
        regionBottomSheet?.classList.add('open');
      });
    }
    if (regionSheetBackdrop) {
      this.bind(regionSheetBackdrop, 'click', regionSheetClose);
    }

    // Region sheet options
    const regionOptions = regionBottomSheet?.querySelectorAll('.region-sheet-option');
    regionOptions?.forEach(opt => {
      this.bind(opt, 'click', (e) => {
        const region = (e.currentTarget as HTMLElement).dataset.region;
        if (region && this.ctx.map) {
          this.ctx.map.setView(region as any, undefined);
          regionOptions.forEach(o => o.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
          regionSheetClose();
        }
      });
    });

    // Mobile settings
    const mobileMenuSettings = document.getElementById('mobileMenuSettings');
    if (mobileMenuSettings) {
      this.bind(mobileMenuSettings, 'click', () => {
        // Settings handled by unified settings
      });
    }
  }

  private setupRegionSelector(): void {
    const select = document.getElementById('regionSelect') as HTMLSelectElement;
    if (!select) return;

    this.bind(select, 'change', () => {
      const view = select.value;
      if (this.ctx.map) {
        this.ctx.map.setView(view as any, undefined);
      }
    });
  }

  private setupMapDimensionToggle(): void {
    const container = document.getElementById('mapDimensionToggle');
    if (!container) return;

    const btns = container.querySelectorAll('.map-dim-btn');
    btns.forEach(btn => {
      this.bind(btn, 'click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode;
        if (!mode) return;

        saveToStorage(STORAGE_KEYS.mapMode, mode);
        btns.forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        if (this.ctx.map) {
          if (mode === 'globe') {
            this.ctx.map.switchToGlobe();
          } else {
            this.ctx.map.switchToFlat();
          }
        }
      });
    });
  }

  private setupMapFullscreen(): void {
    const btn = document.getElementById('mapFullscreenBtn');
    if (!btn) return;

    this.bind(btn, 'click', () => {
      const mapSection = document.getElementById('mapSection');
      if (!mapSection) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapSection.requestFullscreen();
      }
    });
  }

  private setupMapPin(): void {
    const btn = document.getElementById('mapPinBtn');
    if (!btn) return;

    this.bind(btn, 'click', () => {
      const mapSection = document.getElementById('mapSection');
      if (!mapSection) return;
      mapSection.classList.toggle('pinned');
      btn.classList.toggle('active');
      this.callbacks.ensureCorrectZones();
    });
  }

  private setupMapResize(): void {
    const handle = document.getElementById('mapResizeHandle');
    if (!handle) return;

    let startY = 0;
    let startHeight = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(window.innerHeight - 200, startHeight + delta));
      const mapSection = document.getElementById('mapSection');
      if (mapSection) {
        mapSection.style.height = `${newHeight}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.dispatchEvent(new Event('resize'));
    };

    this.bind(handle, 'mousedown', (e: Event) => {
      const me = e as MouseEvent;
      const mapSection = document.getElementById('mapSection');
      if (!mapSection) return;
      startY = me.clientY;
      startHeight = mapSection.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  private setupMapWidthResize(): void {
    const handle = document.getElementById('mapWidthResizeHandle');
    if (!handle) return;

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(300, Math.min(window.innerWidth - 300, startWidth + delta));
      const mapSection = document.getElementById('mapSection');
      if (mapSection) {
        mapSection.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.dispatchEvent(new Event('resize'));
    };

    this.bind(handle, 'mousedown', (e: Event) => {
      const me = e as MouseEvent;
      const mapSection = document.getElementById('mapSection');
      if (!mapSection) return;
      startX = me.clientX;
      startWidth = mapSection.offsetWidth;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.callbacks.setHiddenSince(Date.now());
      } else {
        this.callbacks.flushStaleRefreshes();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupGithubStars(): void {
    const el = document.getElementById('githubStars');
    if (!el) return;

    fetch('https://api.github.com/repos/koala73/worldmonitor')
      .then(r => r.json())
      .then((data: { stargazers_count?: number }) => {
        if (data.stargazers_count !== undefined) {
          el.textContent = `${data.stargazers_count}`;
        }
      })
      .catch(() => {});
  }
}
