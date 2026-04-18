import type { AppContext, AppModule, CountryBriefSignals } from '@/app/app-context';

export class CountryIntelManager implements AppModule {

  constructor(_ctx: AppContext) {
  }

  async init(): Promise<void> {
    // Simplified: country intel panels removed
  }

  destroy(): void {
    // No-op
  }

  openCountryBrief(_code: string, _name?: string): void {
    // No-op: panel removed
  }

  closeCountryBrief(): void {
    // No-op
  }

  openCountryStory(_code: string, _name: string): void {
    // No-op: modal removed
  }

  updateCountryData(_code: string, _data: CountryBriefSignals): void {
    // No-op
  }
}
