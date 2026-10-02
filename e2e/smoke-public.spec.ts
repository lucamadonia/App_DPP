import { test, expect, type Page } from '@playwright/test';

/**
 * Public-surface smoke test.
 *
 * Runs against the local server started by playwright.config.ts (`vite
 * preview` on localhost) — never against production. Asserts that the
 * unauthenticated entry points render real UI rather than a blank page or the
 * error-boundary fallback.
 *
 * Only the unknown-portal case needs a backend (the "Portal not found" state is
 * shown solely for a definite empty lookup, never for a failed request). When
 * no Supabase backend answers, that test skips instead of failing.
 */

const ERROR_FALLBACK = /Something went wrong|Etwas ist schiefgelaufen/i;

/** Collects uncaught page errors so a crash is reported, not just a blank page. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function expectNoCrash(page: Page, errors: string[]) {
  await expect(page.locator('body')).not.toHaveText(ERROR_FALLBACK);
  // Chunk/hydration failures surface as pageerror even when the DOM looks fine.
  expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
}

test.describe('public smoke', () => {
  test('/landing renders a headline', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/landing');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, errors);
  });

  test('/login renders an email field', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, errors);
  });

  test('/returns/track renders the tracking form', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/returns/track');
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, errors);
  });

  test('unknown returns-portal slug shows "Portal not found"', async ({ page }) => {
    let backendAnswered = false;
    page.on('response', (res) => {
      // Any HTTP answer from Supabase (even 4xx) proves the backend is reachable.
      if (/\/rest\/v1\/|\/functions\/v1\//.test(res.url())) backendAnswered = true;
    });

    await page.goto('/returns/portal/e2e-smoke-unknown-tenant');

    const notFound = page.getByRole('heading', { name: /Portal not found|Portal nicht gefunden/i });
    const appeared = await notFound
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    test.skip(!appeared && !backendAnswered, 'No Supabase backend reachable from the local server.');

    expect(appeared, 'backend answered but the not-found state did not render').toBe(true);
    await expect(page.locator('body')).not.toHaveText(ERROR_FALLBACK);
  });
});
