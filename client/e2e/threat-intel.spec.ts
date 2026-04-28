import { expect, test, type Page } from '@playwright/test';

type ThreatIntelItem = {
  id: string;
  tone: 'critical' | 'warning' | 'info';
  level: string;
  victim: string;
  attacker: string;
  source: string;
  address: string;
  occurredAt: string;
};

function buildThreatIntelItems(revision: number): ThreatIntelItem[] {
  return Array.from({ length: 30 }, (_, index) => {
    const order = index + 1;
    const minute = String(59 - index).padStart(2, '0');

    return {
      id: `intel-${String(order).padStart(3, '0')}`,
      tone: index % 3 === 0 ? 'critical' : index % 3 === 1 ? 'warning' : 'info',
      level: index % 3 === 0 ? '严重' : index % 3 === 1 ? '告警' : '情报',
      victim: `观测目标 ${String(order).padStart(2, '0')}`,
      attacker: `攻击方 ${revision}-${String(order).padStart(2, '0')}`,
      source: `${String(10 + index).padStart(2, '0')}.0.x.x`,
      address: `城市 ${String(order).padStart(2, '0')}`,
      occurredAt: `2026-04-23T09:${minute}:00Z`,
    };
  });
}

async function installThreatIntelRoute(page: Page) {
  let revision = 0;

  await page.route('**/api/threat-intel**', async (route) => {
    revision += 1;
    const url = new URL(route.request().url());
    const sort = url.searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
    const limit = Number(url.searchParams.get('limit') ?? '30');
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const sortedItems = buildThreatIntelItems(revision).sort((left, right) => {
      return sort === 'asc'
        ? left.occurredAt.localeCompare(right.occurredAt)
        : right.occurredAt.localeCompare(left.occurredAt);
    });
    const items = sortedItems.slice(offset, offset + limit);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sort,
        total: sortedItems.length,
        limit,
        offset,
        items,
      }),
    });
  });
}

test('threat intel panel supports sort toggles, auto scroll, and refresh polling', async ({ page }) => {
  await installThreatIntelRoute(page);
  await page.goto('/');

  await expect(page.getByText('威胁观察列表', { exact: true })).toBeVisible();
  await expect(page.locator('.intel-card')).toHaveCount(30);
  await expect(page.getByRole('button', { name: '倒序' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.intel-card').first()).toContainText('观测目标 01');

  await page.getByRole('button', { name: '正序' }).click();
  await expect(page.getByRole('button', { name: '正序' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.intel-card').first()).toContainText('观测目标 30');

  await page.getByRole('button', { name: '自动滚动 关' }).click();
  await expect(page.getByRole('button', { name: '自动滚动 开' })).toBeVisible();

  const beforeScrollTop = await page.locator('.intel-list').evaluate((element) => (element as HTMLElement).scrollTop);
  await page.waitForTimeout(1000);
  const afterScrollTop = await page.locator('.intel-list').evaluate((element) => (element as HTMLElement).scrollTop);
  expect(afterScrollTop).toBeGreaterThan(beforeScrollTop);

  await page.getByRole('button', { name: '定时刷新 关' }).click();
  await expect(page.getByRole('button', { name: '定时刷新 开' })).toBeVisible();

  const beforeRefreshText = await page.locator('.intel-card').first().textContent();
  await page.waitForTimeout(16050);
  const afterRefreshText = await page.locator('.intel-card').first().textContent();
  expect(afterRefreshText).not.toEqual(beforeRefreshText);
});
