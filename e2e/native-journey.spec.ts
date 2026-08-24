import { test, expect, type Page } from '@playwright/test';
import {
  collectExternalRequests,
  findOverflowingElements,
  findSmallTapTargets,
} from './helpers/overflow';

/**
 * First-run journey and guest mode.
 *
 * These surfaces are native-only in every shipping build. They are reachable
 * here because CI builds with VITE_E2E_FIRST_RUN=1, which flips
 * `showsFirstRun()` — NOT `isNative()`, which stays a security boundary. See
 * src/lib/platform.ts. Without the flag the routes are not compiled in at all,
 * so every test skips with a message naming the flag rather than failing for a
 * reason that has nothing to do with the code under test.
 *
 * The journey pager is deliberately excluded from the overflow assertion: a
 * framer-motion track is `overflow: hidden` with a transformed child eight
 * viewports wide, which findOverflowingElements does not skip. Loosening the
 * helper would blind the fifteen existing routes to a real class of bug, so the
 * pager is excluded instead. The six guest tool routes are ordinary scrolling
 * pages and are covered in full.
 */

const GUEST_ROUTES = [
  { path: '/discover', name: 'Discover hub' },
  { path: '/discover/requirements', name: 'Requirements check' },
  { path: '/discover/checklists', name: 'Checklists' },
  { path: '/discover/qr', name: 'QR generator' },
  { path: '/discover/regulations', name: 'Regulations' },
  { path: '/discover/lexicon', name: 'Certificates lexicon' },
  { path: '/discover/tips', name: 'Daily tips' },
];

/** Same Supabase stub as the overflow suite: CI has no backend. */
test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => url.hostname.endsWith('supabase.co'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '[]',
      })
  );
});

/**
 * Navigate, then report whether the build under test has the first-run routes
 * compiled in.
 *
 * Combined into one call on purpose: a separate probe navigation followed by
 * the real one makes Playwright abort with "interrupted by another navigation",
 * because React Router is still settling its own replace() when the second
 * goto arrives.
 *
 * `waitForURL` rather than a bare goto: the redirect out of a protected route
 * only happens once AuthProvider has resolved, which is after networkidle.
 */
async function gotoFirstRun(page: Page, path: string): Promise<boolean> {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page
    .waitForURL((url) => !url.pathname.startsWith('/discover') || url.pathname === path, {
      timeout: 3000,
    })
    .catch(() => undefined);
  return !new URL(page.url()).pathname.startsWith('/login');
}

const NO_FLAG = 'build without VITE_E2E_FIRST_RUN=1';

test.describe('first-run journey', () => {
  test('the root sends a signed-out visitor into the journey, not to a bare login form', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // The redirect fires only once AuthProvider settles, which is after
    // networkidle — asserting immediately would race it.
    await page
      .waitForURL((url) => url.pathname !== '/', { timeout: 5000 })
      .catch(() => undefined);

    const landed = new URL(page.url()).pathname;
    test.skip(landed === '/login', NO_FLAG);
    expect(landed).toBe('/onboarding');
  });

  test('shows eight panels and marks exactly one current step', async ({ page }) => {
    test.skip(!(await gotoFirstRun(page, '/onboarding')), NO_FLAG);

    // Matches both locales: the aria-label is interpolated from one key.
    const steps = page.locator('[aria-label^="Go to screen"], [aria-label^="Zu Bildschirm"]');
    await expect(steps).toHaveCount(8);
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  });

  test('the finish panel offers three ways out', async ({ page }) => {
    test.skip(!(await gotoFirstRun(page, '/onboarding')), NO_FLAG);
    await page.locator('[aria-label$="8"]').click();

    // Asserting on button count rather than copy: the wording is translated and
    // will be tuned, but there must always be three doors available.
    const buttons = page.locator('button:visible');
    expect(await buttons.count()).toBeGreaterThanOrEqual(3);
  });

  test('requests nothing from outside the app origin', async ({ page, baseURL }) => {
    // Walking all eight panels plus their decodes takes longer than the 30s
    // default on the larger profile, where every frame is more pixels. This is
    // slowness, not a stuck interaction: the identical test passes well inside
    // the default on iPhone SE.
    test.setTimeout(90_000);

    const external = collectExternalRequests(page, baseURL!);
    test.skip(!(await gotoFirstRun(page, '/onboarding')), NO_FLAG);

    for (let i = 2; i <= 8; i += 1) {
      await page.locator(`[aria-label$="${i}"]`).click();
      await page.waitForTimeout(80);
    }

    // Supabase is intercepted at the route level and never actually leaves.
    const offenders = external.filter((u) => !u.includes('supabase.co'));
    expect(
      offenders,
      `First run must work with no connection at all: the images ship inside the APK and the native build has no service worker to rescue a missed fetch.\nOff-origin requests:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  test('backdrops load and stay within the asset budget', async ({ page }) => {
    // Walking all eight panels plus their decodes takes longer than the 30s
    // default on the larger profile, where every frame is more pixels. This is
    // slowness, not a stuck interaction: the identical test passes well inside
    // the default on iPhone SE.
    test.setTimeout(90_000);

    // Claim eight cores before anything runs.
    //
    // useDeviceMotion treats <= 4 logical cores as low-end, which puts
    // useMotionBudget into 'minimal' — and under 'minimal' useJourneyImages
    // deliberately loads NO backdrops at all and sends every slide down the
    // illustration path. GitHub runners have 2-4 cores, so without this the
    // test measures a code path in which the assertion below can never be true,
    // and reports a correctly behaving app as broken.
    //
    // Overriding is the right call rather than skipping: skipping would mean CI
    // never checks the asset budget, which is the entire point of this test.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    });

    const seen = new Map<string, number>();
    const bad: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (!url.includes('/first-run/') || !url.endsWith('.webp')) return;
      if (res.status() !== 200) bad.push(`${url} -> ${res.status()}`);
      const len = Number(res.headers()['content-length'] ?? 0);
      if (len) seen.set(url, len);
    });

    test.skip(!(await gotoFirstRun(page, '/onboarding')), NO_FLAG);
    for (let i = 2; i <= 8; i += 1) {
      await page.locator(`[aria-label$="${i}"]`).click();
      await page.waitForTimeout(80);
    }

    expect(bad, `Backdrops that did not load:\n${bad.join('\n')}`).toEqual([]);
    expect(seen.size, 'no backdrop was requested at all').toBeGreaterThan(0);

    for (const [url, len] of seen) {
      // Journey backdrops are capped at 110 KB each by
      // scripts/build-first-run-assets.mjs. Asserting it again here catches a
      // bypass of that gate at the moment it would actually cost a user.
      expect(len, `${url} is ${Math.round(len / 1024)} KB`).toBeLessThanOrEqual(115 * 1024);
    }
  });

  test('stays navigable with reduced motion', async ({ page }) => {
    // Under reduced motion the pager is replaced by a crossfade with no drag,
    // so this exercises a genuinely different code path.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    test.skip(!(await gotoFirstRun(page, '/onboarding')), NO_FLAG);

    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
    await page.locator('[aria-label$="4"]').click();
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  });
});

test.describe('guest mode', () => {
  for (const route of GUEST_ROUTES) {
    test(`${route.name} does not scroll horizontally`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      test.skip(!(await gotoFirstRun(page, route.path)), NO_FLAG);

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

      expect(errors, `${route.path} threw: ${errors.join(' | ')}`).toHaveLength(0);
    });
  }

  test('hub tap targets are large enough', async ({ page }) => {
    test.skip(!(await gotoFirstRun(page, '/discover')), NO_FLAG);
    const { coarse, small } = await findSmallTapTargets(page);

    // Same host-dependent caveat as the login suite: where the profile does not
    // report a coarse pointer the rule behind `@media (pointer: coarse)` never
    // applies, so skip visibly rather than failing an app that is correct.
    test.skip(!coarse, 'profile does not report a coarse pointer on this host');

    expect(
      small,
      `Below 44px:\n${small.map((s) => `  <${s.tag}> "${s.label}" ${s.height}px`).join('\n')}`
    ).toEqual([]);
  });
});
