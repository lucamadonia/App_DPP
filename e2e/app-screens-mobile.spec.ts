import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { installAppFixture, fixtureId } from './helpers/app-fixture';
import { waitForAppScreen } from './helpers/app-ready';

// Take the inventory from the owning router, so new screens cannot silently
// fall out of coverage. Detail pages without a fixture exercise the empty state.
const router = readFileSync('src/App.tsx', 'utf8');
const protectedRoutes = router.split('<Route element={<ProtectedRoute />}>')[1].split('</Routes>')[0];
const adminRoutes = router.split('<Route path="admin" element={<AdminGuard />}>')[1].split('</Route>')[0];
const paths = ['/', '/admin', ...Array.from(protectedRoutes.matchAll(/<Route path="([^"]+)"/g), m => '/' + m[1]), ...Array.from(adminRoutes.matchAll(/<Route path="([^"]+)"/g), m => '/admin/' + m[1])];
const routes = [...new Set(paths.map(path => path.replace(':yearMonth', '2026-11').replace(':country', 'DE').replace(/:[a-zA-Z]+/g, fixtureId)))];

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });
test.describe.configure({ mode: 'parallel', timeout: 60_000 });
test.beforeEach(async ({ context }) => installAppFixture(context));

for (const path of routes) {
  test(`${path} fits the app viewport`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(/\/login/);
    await waitForAppScreen(page);
    await expect(page.locator('#boot-splash')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.locator('.app-content').evaluate(main => {
      const results: string[] = [];
      if (main.scrollWidth > main.clientWidth + 2) results.push(`main overflow: ${main.scrollWidth} > ${main.clientWidth}`);
      for (const element of main.querySelectorAll<HTMLElement>('button, input, textarea, [role="tablist"], [data-slot="card"]')) {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        // Content may exceed its own intentional scroller; the scroller itself
        // must remain within main. Do not let main's overflow hide bad layouts.
        let parent = element.parentElement;
        let scrolls = false;
        while (parent && parent !== main) {
          if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) { scrolls = true; break; }
          parent = parent.parentElement;
        }
        if (!scrolls && (rect.right > main.getBoundingClientRect().right + 2 || rect.left < main.getBoundingClientRect().left - 2)) results.push(`${element.tagName} ${(element.textContent ?? '').slice(0, 45)} (${Math.round(rect.left)}..${Math.round(rect.right)})`);
      }
      return results.slice(0, 12);
    });
    await testInfo.attach('screen-coverage', { body: JSON.stringify({ path, viewport: page.viewportSize(), errors, problems }), contentType: 'application/json' });
    expect(errors).toEqual([]);
    expect(problems).toEqual([]);
  });
}
