import { test, expect } from '@playwright/test';
import { installAppFixture, fixtureId } from './helpers/app-fixture';
import { waitForAppScreen } from './helpers/app-ready';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.describe.configure({ timeout: 90_000 });
test.beforeEach(async ({ context }) => installAppFixture(context));

test('product wizard preserves input across steps and rotation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/products/new', { waitUntil: 'networkidle' });
  const name = page.getByPlaceholder(/Eco Sneaker Pro/);
  await name.fill('Mobiler Entwurf');
  const actions = page.locator('.app-action-bar');
  await actions.getByRole('button', { name: /Weiter|Next/, exact: true }).click();
  await actions.getByRole('button', { name: /Zurück|Back/, exact: true }).click();
  await expect(name).toHaveValue('Mobiler Entwurf');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(name).toHaveValue('Mobiler Entwurf');
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(name).toHaveValue('Mobiler Entwurf');
  await page.screenshot({ path: testInfo.outputPath('product-form-portrait.png') });
});

test('product detail tabs remain reachable and fit a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/products/${fixtureId}`, { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  const tabs = page.getByRole('tablist').first();
  const destinations = tabs.getByRole('tab');
  for (let index = 0; index < await destinations.count(); index++) {
    const destination = destinations.nth(index);
    await destination.click();
    await expect(destination).toHaveAttribute('aria-selected', 'true');
    await expect(destination).toBeInViewport();
    await page.waitForLoadState('networkidle');
    await waitForAppScreen(page);
    expect(await page.locator('.app-content').evaluate(el => el.scrollWidth - el.clientWidth), await destination.getAttribute('aria-label') ?? '').toBeLessThanOrEqual(2);
  }
});

test('every product wizard step fits a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/products/new', { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/Eco Sneaker Pro/).fill('Mobiler Produktpass');
  const main = page.locator('.app-content');
  for (let step = 0; step < 12; step++) {
    await waitForAppScreen(page);
    const layout = await main.evaluate(el => ({
      overflow: el.scrollWidth - el.clientWidth,
      step: el.querySelector('[data-form-step]')?.getAttribute('data-form-step'),
      overflowingElements: [...el.querySelectorAll<HTMLElement>('*')]
        .filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().right + 2)
        .map(child => ({ tag: child.tagName, className: child.className?.toString(), text: child.innerText?.slice(0, 80), right: child.getBoundingClientRect().right }))
        .slice(0, 15),
    }));
    expect(layout.overflow, `wizard step ${step + 1}: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(2);
    const next = page.locator('.app-action-bar').getByRole('button', { name: /Weiter|Next/, exact: true });
    if (!await next.count()) {
      await expect(page.locator('.app-action-bar').getByRole('button', { name: /Produkt erstellen|Create Product/ })).toBeVisible();
      return;
    }
    // Header text changes before AnimatePresence has replaced the form body.
    // Measure only after the next step itself has mounted.
    const formStep = page.locator('[data-form-step]');
    const before = await formStep.getAttribute('data-form-step');
    await next.click();
    await expect(formStep).not.toHaveAttribute('data-form-step', before!);
    await page.waitForLoadState('networkidle');
  }
  throw new Error('Product wizard did not reach its final step');
});

test('save draft submits the entered product through the existing service', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/products/new', { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/Eco Sneaker Pro/).fill('Mobiler Entwurf');
  const saved = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/products'));
  await page.locator('.app-action-bar').getByRole('button', { name: /Als Entwurf speichern|Save as Draft/ }).click();
  expect((await saved).postDataJSON()).toMatchObject({ name: 'Mobiler Entwurf', status: 'draft' });
  await expect(page).toHaveURL(new RegExp(`/products/${fixtureId}$`));
});

test('product export downloads the loaded product and its batches', async ({ page }) => {
  await page.goto(`/products/${fixtureId}`, { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /^(Exportieren|Export)$/ }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`product-${fixtureId}.json`);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString('utf8'))).toMatchObject({
    product: { id: fixtureId, status: 'live' },
    batches: [{ id: fixtureId, serialNumber: 'QA-BATCH' }],
  });
});

test('editing product rich text survives a form step change', async ({ page }) => {
  await page.goto(`/products/${fixtureId}/edit`, { waitUntil: 'networkidle' });
  await waitForAppScreen(page);
  const editor = page.locator('.tiptap[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  await editor.fill('Mobile Beschreibung bleibt erhalten.');
  // iPad uses the inline form toolbar; phones use its fixed counterpart.
  await page.getByRole('button', { name: /Weiter|Next/, exact: true }).click();
  await expect(page.locator('[data-form-step]')).toHaveAttribute('data-form-step', 'images');
  await page.getByRole('button', { name: /Zurück|Back/, exact: true }).and(page.locator('[data-variant="outline"]')).click();
  await expect(editor).toHaveText('Mobile Beschreibung bleibt erhalten.');
});

test('native keyboard clears navigation and keeps shipment actions above it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/warehouse/shipments/new', { waitUntil: 'networkidle' });
  const actions = page.locator('.app-action-bar');
  await expect(actions).toBeVisible();
  // Simulate only the CSS contract; actual plugin events are covered by the
  // keyboard unit test. This is not a physical-device keyboard acceptance test.
  await page.evaluate(() => {
    document.documentElement.dataset.native = 'true';
    document.documentElement.setAttribute('data-keyboard-open', '');
    document.documentElement.style.setProperty('--kb-h', '300px');
  });
  await expect(page.locator('.app-tab-bar')).toBeHidden();
  await expect.poll(() => actions.evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBe(544);
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-keyboard-open');
    document.documentElement.style.setProperty('--kb-h', '0px');
  });
  // The form keeps its action toolbar after dismissal; tab navigation returns
  // when leaving the form, rather than showing through the translucent toolbar.
  await expect(page.locator('.app-tab-bar')).toBeHidden();
  await expect.poll(() => actions.evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBe(844);
  await page.goto('/products', { waitUntil: 'networkidle' });
  await expect(page.locator('.app-tab-bar')).toBeVisible();
});

test('admin drawer exposes destinations and closes after navigation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/admin/users', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Menü|Menu/, exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('link', { name: 'Tenants', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-drawer.png') });
  await drawer.getByRole('link', { name: 'Tenants', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/tenants$/);
  await expect(drawer).toBeHidden();
});

test('bottom sheet remains scrollable above the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/warehouse/packaging-types', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Neue Umverpackung|Add Packaging Type/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-keyboard-open', '');
    document.documentElement.style.setProperty('--kb-h', '300px');
  });
  await expect.poll(() => sheet.evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBeLessThanOrEqual(544);
  const box = await sheet.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  await expect(sheet.locator('input').first()).toBeVisible();
});
