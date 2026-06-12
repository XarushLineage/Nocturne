import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end walk through the museum:
 * timeline → zoom/pan → period filter → artist card → 3D gallery →
 * painting inspect → back to timeline. Also asserts no uncaught JS errors.
 */

interface Cam {
  x: number;
  y: number;
  s: number;
}

declare global {
  interface Window {
    __nocturneCam?: () => Cam;
    __nocturnePaintings?: number;
  }
}

const getCam = (page: Page) => page.evaluate(() => window.__nocturneCam!());

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // External image hiccups and software-GL warnings are not app bugs.
    if (/ERR_|Failed to load resource|WebGL|GPU|swiftshader|texture/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

test('full museum walkthrough', async ({ page }) => {
  const errors = collectErrors(page);

  // — 1. timeline loads —
  await page.goto('/');
  await expect(page.locator('.masthead h1')).toHaveText('NOCTURNE');
  const canvas = page.locator('.timeline-stage canvas');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof window.__nocturneCam === 'function');

  // — 2. zoom and pan —
  const before = await getCam(page);
  await canvas.hover({ position: { x: 640, y: 360 } });
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(700);
  const afterZoom = await getCam(page);
  expect(afterZoom.s).toBeGreaterThan(before.s);

  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.mouse.move(400, 300, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const afterPan = await getCam(page);
  expect(Math.abs(afterPan.x - afterZoom.x)).toBeGreaterThan(1);

  // — 3. period filter —
  await page.getByRole('button', { name: /Explore/ }).click();
  await page.getByRole('button', { name: /Impressionism 1865/ }).click();
  await page.waitForTimeout(1500);
  const focused = await getCam(page);
  // Impressionism is centered around 1880 — the camera should have flown there.
  expect(Math.abs(focused.x - 1880)).toBeLessThan(40);

  // — 3b. period card appears for the focused period —
  const periodCard = page.locator('.period-card');
  await expect(periodCard).toHaveClass(/visible/);
  await expect(periodCard.locator('.period-name')).toHaveText('Impressionism');

  // — 4. artist card (scoped to the filter panel: the period card also lists artists) —
  await page.getByRole('button', { name: 'Artists' }).click();
  await page.getByPlaceholder('Search artists…').fill('Monet');
  await page.locator('.filter-panel').getByRole('button', { name: /Claude Monet/ }).click();
  const card = page.locator('.artist-card');
  await expect(card).toHaveClass(/visible/);
  await expect(card.locator('.card-name')).toHaveText('Claude Monet');
  await expect(card.locator('.card-dates')).toContainText('1840');
  // major-works preview arrives with the lazy artworks chunk
  await expect(card.locator('.card-work').first()).toBeVisible();

  // — 5. enter the 3D gallery —
  await card.getByRole('button', { name: /Enter Gallery/i }).click();
  await expect(page.locator('.gallery-root canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.hud-title .name')).toHaveText('Claude Monet');

  // — 6. paintings mounted (8 framed works for Monet) —
  await page.waitForFunction(() => (window.__nocturnePaintings ?? 0) >= 8, undefined, { timeout: 30_000 });
  // loading scrim lifts once the first textures are in
  await expect(page.locator('.gallery-loading')).toHaveClass(/done/, { timeout: 45_000 });

  // — 7. inspect a painting (direct click on the right back-wall canvas) —
  await page.locator('.gallery-root canvas').click({ position: { x: 748, y: 357 } });
  const overlay = page.locator('.inspect-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.inspect-title')).not.toBeEmpty();
  await expect(overlay.locator('.inspect-eyebrow')).toHaveText('Claude Monet');
  await expect(overlay.locator('.inspect-sources')).toContainText('Wikipedia');

  // — 8. close inspect —
  await overlay.locator('.inspect-close').click();
  await expect(overlay).toHaveCount(0);

  // — 9. return to the timeline —
  await page.getByRole('button', { name: /Return to Timeline/i }).click();
  await expect(page.locator('.masthead h1')).toHaveText('NOCTURNE', { timeout: 15_000 });
  await expect(page.locator('.timeline-stage canvas')).toBeVisible();

  // — 10. no uncaught errors anywhere in the flow —
  expect(errors).toEqual([]);
});

test('data integrity: periods and artists meet minimums', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.__nocturneCam === 'function');
  // open the filter and count entries — driven by the bundled data
  await page.getByRole('button', { name: /Explore/ }).click();
  const periodItems = page.locator('.filter-list .filter-item');
  // "All periods" + at least 12 periods
  expect(await periodItems.count()).toBeGreaterThanOrEqual(13);
  await page.getByRole('button', { name: 'Artists' }).click();
  expect(await page.locator('.filter-list .filter-item').count()).toBeGreaterThanOrEqual(36);
});
