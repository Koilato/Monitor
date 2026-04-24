import { expect, test, type Page } from '@playwright/test';

const DESKTOP_VIEWPORT = { width: 1440, height: 1200 };
const TABLET_VIEWPORT = { width: 1024, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const DEAD_SELECTORS = [
  'deckgl-map-background',
  'deckgl-map-geometry-shell',
  'deckgl-timestamp',
  'deckgl-legend',
  'map-control-btn',
];

function getFreezeClockScript() {
  return () => {
    const fixedTime = Date.UTC(2026, 3, 23, 12, 0, 0);
    const NativeDate = Date;

    class FrozenDate extends NativeDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }

        super(...args);
      }

      static now() {
        return fixedTime;
      }
    }

    // eslint-disable-next-line no-global-assign
    window.Date = FrozenDate as typeof Date;
    window.setInterval = (() => 0) as typeof window.setInterval;
    window.clearInterval = (() => undefined) as typeof window.clearInterval;
  };
}

async function bootShell(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(getFreezeClockScript());
  await page.goto('/');

  await expect(page.getByText('Global Signal Map')).toBeVisible();
  await expect(page.getByText('Latest Feed', { exact: true })).toBeVisible();
  await expect(page.getByText('SQL inventory sync completed')).toBeVisible();
  await expect(page.locator('.map-surface canvas')).toHaveCount(1);
}

async function collectClassNames(page: Page): Promise<Set<string>> {
  const classNames = await page.evaluate(() => {
    const classes = new Set<string>();
    for (const element of document.querySelectorAll('*')) {
      for (const className of element.classList) {
        classes.add(className);
      }
    }
    return [...classes];
  });

  return new Set(classNames);
}

async function assertDeadSelectorsAbsent(page: Page, stateName: string) {
  const classNames = await collectClassNames(page);

  for (const selector of DEAD_SELECTORS) {
    expect(
      classNames.has(selector),
      `${stateName}: expected ${selector} to be absent from the DOM`,
    ).toBe(false);
  }
}

async function openPopup(page: Page) {
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  await zoomIn.click();
  await zoomIn.click();

  const mapBox = await page.locator('.map-container').boundingBox();
  if (!mapBox) {
    throw new Error('Unable to locate the map container for popup probing');
  }

  const candidatePoints = [
    [0.50, 0.44],
    [0.44, 0.38],
    [0.58, 0.52],
    [0.50, 0.60],
    [0.38, 0.48],
    [0.62, 0.44],
  ].map(([xFactor, yFactor]) => ([
    mapBox.x + mapBox.width * xFactor,
    mapBox.y + mapBox.height * yFactor,
  ] as const));

  for (const [x, y] of candidatePoints) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(350);
    if (await page.locator('.map-popup').isVisible().catch(() => false)) {
      return;
    }
  }

  throw new Error('Unable to open a map popup by probing the map surface');
}

test('dead map selectors stay absent across the main interaction states', async ({ page }) => {
  await bootShell(page, DESKTOP_VIEWPORT);

  await assertDeadSelectorsAbsent(page, 'desktop default');

  await page.getByRole('button', { name: '3D' }).click();
  await expect(page.getByRole('button', { name: '3D' })).toHaveClass(/active/);
  await page.waitForTimeout(200);
  await assertDeadSelectorsAbsent(page, 'desktop 3d');

  await page.getByRole('button', { name: 'Debug Mode' }).click();
  await expect(page.getByText('Map Debug')).toBeVisible();
  await assertDeadSelectorsAbsent(page, 'desktop debug-open');

  await openPopup(page);
  await expect(page.locator('.map-popup')).toBeVisible();
  await assertDeadSelectorsAbsent(page, 'desktop popup-open');
});

test('desktop default shell snapshot', async ({ page }) => {
  await bootShell(page, DESKTOP_VIEWPORT);

  await expect(page).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});

test('desktop 3d shell snapshot', async ({ page }) => {
  await bootShell(page, DESKTOP_VIEWPORT);
  await page.getByRole('button', { name: '3D' }).click();
  await expect(page.getByRole('button', { name: '3D' })).toHaveClass(/active/);
  await page.waitForTimeout(200);

  await expect(page).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});

test('desktop debug-open shell snapshot', async ({ page }) => {
  await bootShell(page, DESKTOP_VIEWPORT);
  await page.getByRole('button', { name: 'Debug Mode' }).click();
  await expect(page.getByText('Map Debug')).toBeVisible();

  await expect(page).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});

test('desktop popup-open shell snapshot', async ({ page }) => {
  await bootShell(page, DESKTOP_VIEWPORT);
  await openPopup(page);
  await expect(page.locator('.map-popup')).toBeVisible();

  await expect(page.locator('.workspace-pane--map')).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    mask: [page.locator('.map-surface canvas')],
  });
});

test('tablet default shell snapshot', async ({ page }) => {
  await bootShell(page, TABLET_VIEWPORT);

  await expect(page).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});

test('mobile default shell snapshot', async ({ page }) => {
  await bootShell(page, MOBILE_VIEWPORT);

  await expect(page).toHaveScreenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
