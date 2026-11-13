import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { installAppFixture, fixtureId } from './helpers/app-fixture';
import { waitForAppScreen, SCREEN_ROOT } from './helpers/app-ready';
import { auditMobileScreen, simulateSafeArea, SIMULATED_SAFE_AREA } from './helpers/mobile-audit';

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
    page.on('console', message => {
      if (message.type() === 'error' && /\[(RouteErrorBoundary|ErrorBoundary)/.test(message.text())) errors.push(message.text());
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(/\/login/);
    await waitForAppScreen(page);
    await expect(page.locator('#boot-splash')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.locator(SCREEN_ROOT).evaluate(main => {
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
    // Design audit on a simulated notched phone; all categories are collected
    // before any assertion, so one run reports everything.
    const phone = (page.viewportSize()?.width ?? 0) < 768;
    if (phone) await simulateSafeArea(page);
    const audit = await auditMobileScreen(page, { safeTop: phone ? SIMULATED_SAFE_AREA.top : 0 });
    const touch = audit.coarse || !!testInfo.project.use.hasTouch;
    const report = { path, project: testInfo.project.name, viewport: page.viewportSize(), errors, problems, ...audit };
    await testInfo.attach('screen-coverage', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    mkdirSync(testInfo.outputDir, { recursive: true });
    writeFileSync(testInfo.outputPath('audit.json'), JSON.stringify(report));
    // Opt-in: one PNG per route x project adds up quickly on disk.
    if (process.env.MOBILE_AUDIT_SCREENSHOTS === '1') await testInfo.attach('screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    const list = (items: string[]) => '\n  ' + items.join('\n  ');
    // Fatal everywhere: runtime errors and horizontal overflow. Design findings
    // fail only with MOBILE_AUDIT_STRICT=1 (local audit runs); otherwise they are
    // recorded as annotations plus audit.json so CI stays a regression net.
    expect(errors).toEqual([]);
    expect(problems, `horizontal overflow on ${path}:${list(problems)}`).toEqual([]);
    const design: [string, string[], boolean][] = [
      ['clipped text', audit.clippedText, true],
      ['tap targets < 44x44', audit.smallTapTargets, touch],
      ['tab bar overlap', audit.tabBarOverlap, phone],
      [`content inside top safe area (${SIMULATED_SAFE_AREA.top}px)`, audit.safeAreaIntrusions, phone],
      ['inputs < 16px font (iOS focus zoom)', audit.smallInputs, touch],
    ];
    const strict = process.env.MOBILE_AUDIT_STRICT === '1';
    for (const [label, items, applies] of design) {
      if (!applies || !items.length) continue;
      if (strict) expect.soft(items, `${label} on ${path}:${list(items)}`).toEqual([]);
      else testInfo.annotations.push({ type: `design: ${label}`, description: items.join('; ') });
    }
  });
}
