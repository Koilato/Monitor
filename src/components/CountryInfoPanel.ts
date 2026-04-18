import { Panel } from './Panel';

export class CountryInfoPanel extends Panel {
  constructor() {
    super({ id: 'country-info', title: '国家信息' });
  }

  setContent(text: string): void {
    const content = this.element.querySelector('.panel-content') as HTMLElement | null;
    if (content) {
      content.innerHTML = `<div class="country-info-text" style="padding:8px 12px;font-size:14px;color:var(--text);">${text}</div>`;
    }
  }

  clear(): void {
    const content = this.element.querySelector('.panel-content') as HTMLElement | null;
    if (content) {
      content.innerHTML = `<div class="country-info-text" style="padding:8px 12px;font-size:13px;color:var(--text-dim);">悬停地图上的国家查看信息</div>`;
    }
  }
}
