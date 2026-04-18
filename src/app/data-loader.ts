import type { AppContext } from '@/app/app-context';

export interface DataLoaderManagerCallbacks {
  renderCriticalBanner: (postures: unknown[]) => void;
  refreshOpenCountryBrief: () => void;
}

export class DataLoaderManager {
  private ctx: AppContext;

  constructor(ctx: AppContext, _callbacks: DataLoaderManagerCallbacks) {
    this.ctx = ctx;
  }

  init(): void {
    // No-op: data loading is triggered by App.init()
  }

  destroy(): void {
    // No-op
  }

  async loadAllData(_isInitial = false): Promise<void> {
    if (this.ctx.isDestroyed) return;

    try {
      await this.loadNews();
    } catch (e) {
      console.error('[DataLoader] loadAllData error:', e);
    }
  }

  async loadNews(): Promise<void> {
    if (this.ctx.isDestroyed) return;

    try {
      // News loading handled by RSS service
      this.ctx.initialLoadComplete = true;
    } catch (e) {
      console.error('[DataLoader] loadNews error:', e);
    }
  }

  async loadSecurityAdvisories(): Promise<void> {
    if (this.ctx.isDestroyed) return;
    // Simplified: no security advisories loading
  }

  syncDataFreshnessWithLayers(): void {
    // Simplified: no layer-specific data loading
  }

  async loadDataForLayer(_layer: string): Promise<void> {
    // Simplified: no layer-specific data loading
  }
}
