import { expect, test } from '@playwright/test';

test('app smoke flow renders the live shell and latest feed data', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Global Signal Map')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('SIGNAL CONSOLE');
  await expect(page.getByText('Latest Feed')).toBeVisible();
  await expect(page.getByText('Loading latest content...')).not.toBeVisible();
  await expect(page.getByText('SQL inventory sync completed')).toBeVisible();
});
