import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Public return registration wizard (`/returns/register/:slug`, embed variant
 * `/embed/register/:slug`) end to end against a fully stubbed Supabase:
 * tenant resolves, the order lookup hits, the insert RPC succeeds. Walks every
 * step on a phone and a desktop viewport and asserts no horizontal overflow.
 *
 * Regression net for the FormWizard migration: step 0 advances only through
 * the reducer (LOOKUP_HIT), never through the wizard itself.
 */

// Walking all 7 steps takes ~35s on the 2-worker CI runner, past the global
// 30s default; a timeout there surfaces as "browser has been closed".
test.describe.configure({ timeout: 90_000 });

const SLUG = 'qa-shop';
const TENANT_ID = '00000000-0000-4000-8000-0000000000a1';
const RETURN_NUMBER = 'RET-20261109-QA0001';

interface Calls { lookups: number; created: Record<string, unknown> | null }

async function stubSupabase(context: BrowserContext): Promise<Calls> {
  const calls: Calls = { lookups: 0, created: null };
  const tenant = { id: TENANT_ID, name: 'QA Shop', slug: SLUG, logo: null, settings: {} };
  const rows: Record<string, unknown> = {
    get_public_tenant_by_slug: tenant,
    get_public_tenant_products: [],
    rh_return_reasons: [{ id: 'r1', tenant_id: TENANT_ID, category: 'not_needed', subcategories: [], follow_up_questions: [], active: true, sort_order: 1 }],
    get_public_shipment_items_by_token: [
      { product_id: 'p1', product_name: 'Travel bag with a deliberately long product name', product_image_url: null, product_gtin: '4006381333931', quantity: 2 },
    ],
  };

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    const resource = url.pathname.split('/').at(-1) ?? '';
    let body: unknown = rows[resource] ?? [];
    if (resource === 'lookup_shipment_by_order_email') {
      calls.lookups += 1;
      body = [{ tracking_token: 'tok-qa', shipment_number: 'SHP-QA-1', status: 'delivered' }];
    }
    if (resource === 'public_create_return') {
      calls.created = route.request().postDataJSON()?.p_payload ?? {};
      body = { success: true, return_id: '00000000-0000-4000-8000-0000000000b1', return_number: RETURN_NUMBER, tenant_id: TENANT_ID };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await context.addInitScript(() => localStorage.setItem('dpp-language', 'en'));
  return calls;
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `horizontal overflow on ${label}`).toBeLessThanOrEqual(width);
}

async function walkWizard(page: Page, calls: Calls, path: string) {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  const next = page.getByRole('button', { name: /^Next$/ });

  await page.goto(path);
  await expect(page.locator('#order-number')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'identify');
  await expect(next).toBeDisabled();
  await page.locator('#order-number').fill('#1001');
  await page.locator('#email').fill('customer@example.invalid');
  await next.click();

  // Items: pre-filled from the lookup, nothing selected yet.
  const item = page.getByText('Travel bag with a deliberately long product name');
  await expect(item).toBeVisible();
  expect(calls.lookups).toBe(1);
  await expectNoHorizontalOverflow(page, 'items');
  await expect(next).toBeDisabled();
  await item.click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await next.click();

  // Reason
  await page.getByRole('button', { name: "Doesn't fit my needs" }).click();
  await expectNoHorizontalOverflow(page, 'reason');
  await next.click();
  // Photos, solution: optional
  await expectNoHorizontalOverflow(page, 'photos');
  await next.click();
  await expectNoHorizontalOverflow(page, 'solution');
  await next.click();

  // Shipping
  await expect(page.locator('#shipping-name')).toBeVisible();
  await expect(next).toBeDisabled();
  await page.locator('#shipping-name').fill('Test Customer');
  await page.locator('#shipping-street').fill('Example Street 1');
  await page.locator('#shipping-postal').fill('12345');
  await page.locator('#shipping-city').fill('Berlin');
  await expectNoHorizontalOverflow(page, 'shipping');
  await next.click();

  // Confirm → jump back to step 0 and forward again must keep the selection
  // (an unchanged order/email reuses the earlier lookup instead of re-seeding).
  const submit = page.getByRole('button', { name: 'Submit Return' });
  await expect(submit).toBeVisible();
  await expect(page.getByText('#1001').first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'confirm');
  await page.getByRole('button', { name: 'Change' }).first().click();
  await expect(page.locator('#order-number')).toHaveValue('#1001');
  await next.click();
  await expect(item).toBeVisible();
  await expect(next).toBeEnabled();
  expect(calls.lookups).toBe(1);
  for (let i = 0; i < 5; i++) await next.click();
  await expect(submit).toBeVisible();
  await submit.click();

  await expect(page.getByText('Return Submitted Successfully!')).toBeVisible();
  await expect(page.getByText(RETURN_NUMBER)).toBeVisible();
  expect(calls.created).toMatchObject({
    tenantSlug: SLUG,
    email: 'customer@example.invalid',
    orderNumber: '#1001',
    reasonCategory: 'not_needed',
    shipmentToken: 'tok-qa',
    items: [{ name: 'Travel bag with a deliberately long product name', quantity: 2, productId: 'p1' }],
  });
  expect(errors, errors.join(' | ')).toEqual([]);
}

for (const [name, viewport, mobile] of [
  ['phone 390', { width: 390, height: 844 }, true],
  ['desktop 1440', { width: 1440, height: 900 }, false],
] as const) {
  test.describe(`public return wizard (${name})`, () => {
    test.use({ viewport, isMobile: mobile, hasTouch: mobile });

    test('full flow on the portal page', async ({ page, context }) => {
      const calls = await stubSupabase(context);
      await walkWizard(page, calls, `/returns/register/${SLUG}`);
    });

    test('full flow in embed mode', async ({ page, context }) => {
      const calls = await stubSupabase(context);
      await walkWizard(page, calls, `/embed/register/${SLUG}`);
    });
  });
}
