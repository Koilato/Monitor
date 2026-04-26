import { expect, test } from '@playwright/test';

test('应用冒烟流程会渲染中文主壳和最新信息流数据', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('全球信号地图')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('信号控制台');
  await expect(page.getByText('最新信息流', { exact: true })).toBeVisible();
  await expect(page.getByText('正在加载最新内容...')).not.toBeVisible();
  await expect(page.getByText('SQL 库存同步完成')).toBeVisible();
});
