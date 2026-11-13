import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { installAppFixture } from './helpers/app-fixture';
import { waitForAppScreen } from './helpers/app-ready';
import { simulateSafeArea, SIMULATED_SAFE_AREA } from './helpers/mobile-audit';

/**
 * Sheets and dialogs on a simulated notched phone.
 *
 * `env(safe-area-inset-*)` is 0 in a desktop browser, so an overlay whose close
 * button sits at `top-4` passes every other test and then hides under the iOS
 * status bar on a real device. Injecting the insets the app derives from env()
 * makes that measurable here.
 */

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });
test.describe.configure({ mode: 'parallel', timeout: 60_000 });
test.beforeEach(async ({ context }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width ?? 0) >= 768, 'Phone overlays only; the tab bar and drawer are md:hidden.');
  await installAppFixture(context);
});

interface Scenario {
  name: string;
  path: string;
  open: (page: Page) => Promise<void>;
}

const scenarios: Scenario[] = [
  {
    name: 'More sheet (bottom tab bar)',
    path: '/',
    open: page => page.locator('.app-tab-bar button[aria-haspopup="dialog"]').click(),
  },
  {
    name: 'Sidebar drawer (header menu)',
    path: '/',
    open: page => page.locator('header [data-sidebar="trigger"]').first().click(),
  },
  {
    name: 'New supplier dialog',
    path: '/suppliers',
    open: page => page.locator('.app-content').getByRole('button', { name: /Neuer Lieferant|New Supplier/ }).first().click(),
  },
  {
    name: 'Invite supplier dialog',
    path: '/suppliers',
    open: page => page.locator('.app-content').getByRole('button', { name: /Lieferant einladen|Invite Supplier/ }).first().click(),
  },
  {
    name: 'Product import dialog',
    path: '/products',
    open: page => page.locator('.app-content').getByRole('button', { name: /^(Import|Importieren)$/ }).first().click(),
  },
];

for (const scenario of scenarios) {
  test(`${scenario.name} respects safe area and touch size`, async ({ page }, testInfo) => {
    await page.goto(scenario.path, { waitUntil: 'networkidle' });
    await waitForAppScreen(page);
    await simulateSafeArea(page);
    await scenario.open(page);

    const overlay = page.locator('[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"], [role="dialog"]').filter({ visible: true }).first();
    await expect(overlay).toBeVisible();
    // Measure the settled position, not a frame of the enter transition.
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), undefined, { timeout: 5_000 }).catch(() => {});
    // Lazy content can remount the sheet and restart its slide-in after the
    // check above; wait until the overlay's box is unchanged for ~400ms
    // (sub-pixel, so an ease-out tail does not read as settled).
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"], [role="dialog"]');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const key = [r.top, r.bottom, r.left, r.right].map(v => v.toFixed(1)).join(",");
      const w = window as unknown as { __overlayBox?: { key: string; since: number } };
      const now = performance.now();
      if (w.__overlayBox?.key !== key) { w.__overlayBox = { key, since: now }; return false; }
      return now - w.__overlayBox.since >= 400 && document.getAnimations().every(a => a.playState !== 'running');
    }, undefined, { timeout: 8_000, polling: 50 }).catch(() => {});

    const findings = await page.evaluate(({ safeTop, safeBottom }) => {
      const describe = (el: Element) => {
        const h = el as HTMLElement;
        const slot = h.getAttribute('data-slot');
        const cls = (h.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 4).join('.');
        const label = h.getAttribute('aria-label') ?? h.innerText?.replace(/\s+/g, ' ').trim();
        return `${el.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ''}${cls ? '.' + cls : ''}${label ? ` "${label.slice(0, 30)}"` : ''}`;
      };
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const closeButtons: string[] = [];
      const contentFit: string[] = [];
      const selector = '[data-slot="sheet-close"], [data-slot="dialog-close"], button[aria-label*="close" i], button[aria-label*="schließen" i]';
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (!visible(el) || !el.closest('[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"], [role="dialog"]')) continue;
        const r = el.getBoundingClientRect();
        const issues: string[] = [];
        if (r.top < safeTop) issues.push(`top ${Math.round(r.top)} < safe-top ${safeTop}`);
        if (r.bottom > vh - safeBottom && r.top > vh / 2) issues.push(`bottom ${Math.round(r.bottom)} > ${vh - safeBottom} (home indicator)`);
        if (r.width < 44 || r.height < 44) issues.push(`size ${Math.round(r.width)}x${Math.round(r.height)} < 44x44`);
        if (issues.length) closeButtons.push(`${describe(el)}: ${issues.join(', ')}`);
      }
      for (const el of document.querySelectorAll<HTMLElement>('[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"], [role="dialog"]')) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        const issues: string[] = [];
        if (r.left < -1 || r.right > vw + 1) issues.push(`horizontal ${Math.round(r.left)}..${Math.round(r.right)} outside 0..${vw}`);
        if (r.top < -1 || r.bottom > vh + 1) issues.push(`vertical ${Math.round(r.top)}..${Math.round(r.bottom)} outside 0..${vh}`);
        if (el.scrollWidth > el.clientWidth + 1 && !['auto', 'scroll'].includes(getComputedStyle(el).overflowX)) issues.push(`content wider than panel (${el.scrollWidth} > ${el.clientWidth})`);
        if (issues.length) contentFit.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}: ${issues.join(', ')}`);
      }
      return { viewport: `${vw}x${vh}`, closeButtons, contentFit };
    }, { safeTop: SIMULATED_SAFE_AREA.top, safeBottom: SIMULATED_SAFE_AREA.bottom });

    await testInfo.attach('overlay-audit', { body: JSON.stringify({ scenario: scenario.name, project: testInfo.project.name, ...findings }, null, 2), contentType: 'application/json' });
    mkdirSync(testInfo.outputDir, { recursive: true });
    writeFileSync(testInfo.outputPath('overlay.json'), JSON.stringify({ scenario: scenario.name, path: scenario.path, project: testInfo.project.name, ...findings }));
    // Opt-in: one PNG per route x project adds up quickly on disk.
    if (process.env.MOBILE_AUDIT_SCREENSHOTS === '1') await testInfo.attach('screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    const list = (items: string[]) => '\n  ' + items.join('\n  ');
    expect.soft(findings.closeButtons, `close buttons in "${scenario.name}" (${findings.viewport}):${list(findings.closeButtons)}`).toEqual([]);
    expect.soft(findings.contentFit, `overlay content in "${scenario.name}" (${findings.viewport}):${list(findings.contentFit)}`).toEqual([]);
  });
}
