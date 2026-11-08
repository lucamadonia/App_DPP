import { test, expect } from '@playwright/test';
import { installAppFixture } from './helpers/app-fixture';
import { waitForAppScreen } from './helpers/app-ready';

// Real motion is essential here: reduced-motion disables the buggy gesture and
// made static layout checks miss a page that can be dragged from anywhere.
test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference', viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ context }) => installAppFixture(context));

for (const path of ['/warehouse/shipments', '/warehouse/inventory', '/products/new']) {
  test(`${path} stays anchored during a drag in the page body`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await waitForAppScreen(page);
    const content = page.locator('.app-content').getByRole('heading').first();
    const origin = await content.boundingBox();
    expect(origin).not.toBeNull();
    await page.mouse.move(160, 250);
    await page.mouse.down();
    await page.mouse.move(300, 255, { steps: 12 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const during = await content.boundingBox();
    expect(Math.abs(during!.x - origin!.x)).toBeLessThanOrEqual(1);
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(await page.locator('.app-content').evaluate(el => el.scrollLeft)).toBe(0);
  });
}

test('native shell keeps its header fixed while the shipment list scrolls', async ({ page }) => {
  await page.goto('/warehouse/shipments', { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  // Exercise the native CSS contract without changing auth/platform behavior.
  await page.evaluate(() => { document.documentElement.dataset.native = 'true'; });
  const header = page.locator('header').first();
  const before = await header.boundingBox();
  const scroll = await page.locator('.app-content').evaluate(el => {
    el.scrollTop = 250;
    return { top: el.scrollTop, height: el.clientHeight, viewport: window.innerHeight };
  });
  expect(scroll.top).toBeGreaterThan(0);
  expect(scroll.height).toBeLessThan(scroll.viewport);
  expect((await header.boundingBox())!.y).toBe(before!.y);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(header.getByRole('img', { name: 'Trackbliss' })).toBeVisible();
});

test('back from a directly opened shipment list stays inside the app', async ({ page }) => {
  await page.goto('/warehouse/shipments', { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  const content = page.locator('.app-swipe-content');
  const before = await content.boundingBox();
  await page.mouse.move(5, 250);
  await page.mouse.down();
  await page.mouse.move(250, 255, { steps: 18 });
  // Wait for the rendered drag, not merely for protocol input delivery.
  await expect.poll(async () => (await content.boundingBox())!.x - before!.x).toBeGreaterThan(80);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/warehouse$/);
  await waitForAppScreen(page);
});

test('a downward pull in the middle of shipments does not shift the list', async ({ page }) => {
  await page.goto('/warehouse/shipments', { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  await page.evaluate(() => { document.documentElement.dataset.native = 'true'; });
  const main = page.locator('.app-content');
  await main.evaluate(el => { el.scrollTop = 180; });
  const heading = main.getByRole('heading').first();
  const before = await heading.boundingBox();
  await heading.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 11, clientX: 160, clientY: 250, bubbles: true });
  await heading.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 11, clientX: 160, clientY: 440, bubbles: true });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(async () => (await heading.boundingBox())!.y).toBe(before!.y);
  await heading.dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 11, bubbles: true });
  await expect(page).toHaveURL(/\/warehouse\/shipments$/);
});

test('a cancelled edge gesture returns the page without navigating', async ({ page }) => {
  await page.goto('/warehouse/shipments', { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  const content = page.locator('.app-swipe-content');
  const before = await content.boundingBox();
  await page.mouse.move(5, 250);
  await page.mouse.down();
  await page.mouse.move(220, 250, { steps: 18 });
  await expect.poll(async () => (await content.boundingBox())!.x - before!.x).toBeGreaterThan(80);
  await content.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: 220, clientY: 250, bubbles: true });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await content.boundingBox())!.x - before!.x)).toBeLessThan(1);
  await expect(page).toHaveURL(/\/warehouse\/shipments$/);
});
