import type { AppContext, AppModule } from '@/app/app-context';

export class SearchManager implements AppModule {

  constructor(_ctx: AppContext) {
  }

  async init(): Promise<void> {
    // Simplified: search modal removed
  }

  destroy(): void {
    // No-op
  }

  open(): void {
    // No-op: search modal removed
  }

  close(): void {
    // No-op
  }

  updateSearchIndex(): void {
    // No-op
  }

  refreshSearch(): void {
    // No-op
  }

  scrollToNewsItem(_id: string): void {
    // No-op
  }
}
