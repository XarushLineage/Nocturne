// Quick visual-check harness (dev aid, not part of the app):
//   node scripts/shot.mjs <url-path> <out.png> [actions]
// actions: a small comma list like "zoom", "card", "gallery", "inspect"
import { chromium } from '@playwright/test';

const [, , urlPath = '/', out = 'shot.png', actions = ''] = process.argv;
const acts = actions.split(',').filter(Boolean);

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:5173${urlPath}`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1800);

for (const act of acts) {
  if (act === 'zoom') {
    await page.mouse.move(720, 430);
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(1200);
  } else if (act === 'filter') {
    await page.getByRole('button', { name: /Explore/ }).click();
    await page.waitForTimeout(800);
  } else if (act === 'period') {
    await page.getByRole('button', { name: /Impressionism 1865/ }).click();
    await page.waitForTimeout(1800);
  } else if (act === 'card') {
    await page.getByRole('button', { name: /Explore/ }).click();
    await page.getByRole('button', { name: 'Artists' }).click();
    await page.getByPlaceholder('Search artists…').fill('Vermeer');
    await page.getByRole('button', { name: /Johannes Vermeer/ }).click();
    await page.waitForTimeout(2500);
  } else if (act === 'hovermonet') {
    const pos = await page.evaluate(() => window.__nocturneArtistScreen?.('monet'));
    if (pos) await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(900);
  } else if (act === 'workclick') {
    await page.locator('.card-work').first().click();
    await page.waitForTimeout(2500);
  } else if (act === 'gallery') {
    await page.locator('.artist-card').getByRole('button', { name: /Enter Gallery/i }).click();
    await page.waitForTimeout(9000);
  } else if (act === 'inspect') {
    await page.locator('.gallery-root canvas').click({ position: { x: 842, y: 425 } });
    await page.waitForTimeout(2500);
  } else if (act === 'walk') {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1400);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(400);
  }
}

await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
