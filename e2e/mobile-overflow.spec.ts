import { test, expect, type Page } from '@playwright/test';

/**
 * Horizontal-overflow regression net.
 *
 * The most common way this app broke on a phone was a page wider than the
 * viewport — a fixed pixel width, a rigid grid, an unwrapped table. That is
 * objectively measurable, so it is worth asserting on every route rather than
 * trusting a reviewer to notice a 12px overhang.
 *
 * Only unauthenticated routes are covered. See AUTHENTICATED ROUTES at the
 * bottom for what covering the rest would take, and why it is not done here.
 */

/** Routes reachable without a session. */
const PUBLIC_ROUTES = [
  { path: '/login', name: 'Login' },
  { path: '/landing', name: 'Landing' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/imprint', name: 'Imprint' },
  { path: '/privacy', name: 'Privacy policy' },
  { path: '/terms', name: 'Terms' },
  { path: '/auth/reset-password', name: 'Password reset' },

  // Customer-facing surfaces. These use deliberately invalid parameters, so
  // what gets asserted is the not-found / empty rendering — which is real UI a
  // customer can land on (a mistyped code, an expired invitation, a QR sticker
  // for a product that was deleted) and must not overflow either.
  //
  // Fake values on purpose: a test must not depend on production rows, and
  // seeding real ones would tie the suite to a live database.
  { path: '/p/0000000000000/E2E-NOPE', name: 'DPP passport (unknown product)' },
  { path: '/01/0000000000000/21/E2E-NOPE', name: 'DPP via GS1 Digital Link' },
  { path: '/p/0000000000000/E2E-NOPE/customs', name: 'DPP customs view' },
  { path: '/t/e2e-invalid-token', name: 'Shipment tracking (bad token)' },
  { path: '/returns/track', name: 'Return tracking (no number)' },
  { path: '/returns/portal/e2e-nope', name: 'Returns portal (unknown tenant)' },
  { path: '/suppliers/register/e2e-invalid', name: 'Supplier registration (bad code)' },
  { path: '/transparency/e2e-nope', name: 'Transparency page (unknown tenant)' },
];

/**
 * Finds every element wider than the viewport.
 *
 * Reports the offenders rather than just failing: "something overflows" is not
 * actionable, you need to know which element. Ignores anything inside a
 * deliberate horizontal scroller (`overflow-x: auto/scroll`), since those are
 * meant to exceed their container.
 */
async function findOverflowingElements(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders: { tag: string; cls: string; width: number }[] = [];

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= viewportWidth + 1) continue;

      let parent: HTMLElement | null = el.parentElement;
      let insideScroller = false;
      while (parent && parent !== document.body) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          insideScroller = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (insideScroller) continue;

      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.toString() ?? '').slice(0, 120),
        width: Math.round(rect.width),
      });
    }
    return { viewportWidth, offenders: offenders.slice(0, 8) };
  });
}

for (const route of PUBLIC_ROUTES) {
  test(`${route.name} does not scroll horizontally`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(route.path, { waitUntil: 'networkidle' });

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    const { offenders } = await findOverflowingElements(page);
    const detail = offenders.length
      ? '\nWidest offenders:\n' +
        offenders.map((o) => `  <${o.tag} class="${o.cls}"> ${o.width}px`).join('\n')
      : '';

    expect(
      scrollWidth,
      `${route.path} overflows by ${scrollWidth - clientWidth}px at ${clientWidth}px wide.${detail}`
    ).toBeLessThanOrEqual(clientWidth + 1);

    // A page that throws is not "passing" merely because it happens to fit.
    expect(errors, `${route.path} threw: ${errors.join(' | ')}`).toHaveLength(0);
  });
}

test('login form tap targets are large enough', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // WCAG 2.5.5 asks for 44x44. The app enforces this with a coarse-pointer CSS
  // rule rather than per component, so it is worth verifying the selector
  // actually matches rather than assuming it does.
  const small = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>('button, a[href], input[type="submit"]')
    )) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden
      if (r.height < 44) {
        bad.push(
          `${el.tagName.toLowerCase()}"${el.textContent?.trim().slice(0, 30)}" ${Math.round(r.height)}px`
        );
      }
    }
    return bad;
  });

  expect(small, `Below 44px tall: ${small.join(', ')}`).toHaveLength(0);
});

/**
 * AUTHENTICATED ROUTES — not covered, and worth stating why.
 *
 * The ~110 routes behind ProtectedRoute are where most of the mobile work
 * landed, so they are the ones that most need this net. Covering them needs:
 *
 *   1. a dedicated Supabase test user — never a real tenant's credentials
 *   2. a global-setup that signs in once and writes storageState.json
 *   3. E2E_EMAIL / E2E_PASSWORD as CI secrets
 *
 * Left for a human deliberately: it means creating a real account with real
 * credentials in the real project, which is not a call to make unilaterally.
 */
