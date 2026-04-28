import { expect, test } from '@playwright/test';

test('应用冒烟流程会渲染中文主壳和态势统计数据', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('全球信号地图')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('信号控制台');
  await expect(page.getByText('威胁观察列表', { exact: true })).toBeVisible();
  await expect(page.getByText('7天威胁频次', { exact: true })).toBeVisible();
  await expect(page.getByText('来源国家流量', { exact: true })).toBeVisible();
  await expect(page.getByText('威胁统计', { exact: true })).toBeVisible();
});
