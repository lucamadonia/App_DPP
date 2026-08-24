import { test, expect } from '@playwright/test';
import { findOverflowingElements } from './helpers/overflow';

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
 * Answers every Supabase call with an empty result set.
 *
 * CI has no real backend, and a placeholder URL makes WebKit reject the request
 * outright ("due to access control checks"), which surfaces as an unhandled
 * rejection — the pageerror assertion below then fails for a reason that has
 * nothing to do with layout. Stubbing keeps these routes rendering their
 * empty/not-found state, which is exactly what this suite means to measure, and
 * removes the dependency on credentials entirely.
 */
test.beforeEach(async ({ page }) => {
  await page.route((url) => url.hostname.endsWith('supabase.co'), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      // The browser still applies CORS to a fulfilled response.
      headers: { 'access-control-allow-origin': '*' },
      body: '[]',
    })
  );
});

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

  // The rule under test lives behind `@media (pointer: coarse)`, and whether a
  // profile reports one turns out to depend on the HOST, not just the device
  // preset: iPad Mini reports coarse under WebKit on Windows but fine under
  // WebKit on the Linux CI runner, despite hasTouch being set in both.
  //
  // Where it reports fine the rule never applies, so every button measures its
  // natural height (h-11 = 2.75rem ~= 42.7px once WebKit autosizes the root
  // font) and the assertion would fail on an app that is actually correct — a
  // real iPad does report coarse. Skipping visibly rather than returning early
  // keeps that in the report, and the assertion goes live again by itself
  // wherever the pointer is emulated.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  test.skip(!coarse, 'This device profile does not emulate a coarse pointer.');

  // Measure only once the entrance animation has settled. The page variants in
  // src/lib/motion.ts animate scale 0.97 -> 1, and getBoundingClientRect reports
  // the TRANSFORMED box — so mid-flight a correctly sized 44px button measures
  // 44 * 0.97 = 42.7px. That is what CI was failing on: an animation frame, not
  // a tap target that is too small.
  // Wait for the entrance animation to finish, or the measurement lands on an
  // animation frame: the page variants in src/lib/motion.ts animate scale
  // 0.97 -> 1, and getBoundingClientRect reports the TRANSFORMED box, so a
  // correctly sized 44px button reads 42.7px mid-flight.
  //
  // Neither document.getAnimations() nor "no ancestor has a transform" works as
  // the signal: framer-motion drives springs from JS so they are not web
  // animations, and some elements keep a transform permanently. Compare the two
  // boxes directly instead — they only agree once nothing is scaling.
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button');
      if (!btn) return false;
      const rendered = btn.getBoundingClientRect().height;
      const layout = parseFloat(getComputedStyle(btn).height);
      return Math.abs(rendered - layout) < 0.5;
    },
    undefined,
    { timeout: 10_000 }
  );

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

      // WCAG 2.5.5 exempts targets inside a sentence or block of text — a
      // "Terms of Service" link mid-paragraph cannot be 44px tall without
      // wrecking the line height. `display: inline` is the reliable signal.
      if (getComputedStyle(el).display === 'inline') continue;

      if (r.height < 44) {
        bad.push(
          `${el.tagName.toLowerCase()}"${el.textContent?.trim().slice(0, 30)}" ${r.height.toFixed(1)}px`
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
