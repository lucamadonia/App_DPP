import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile smoke tests.
 *
 * These close a specific gap: the static audit (`npm run audit:mobile`) can say
 * which files contain patterns known to break at 375px, but it cannot say
 * whether a page actually overflows. Only a browser can. This suite asserts the
 * one thing that is objectively checkable without screenshots — that no route
 * scrolls horizontally on a phone — plus an accessibility scan.
 *
 * Deliberately narrow: a regression net, not a design review.
 */
/** Layout sweeps that are worth repeating on every phone width. */
const PHONE_SWEEP = [/app-screens-mobile\.spec\.ts/, /mobile-overflow\.spec\.ts/, /mobile-overlays\.spec\.ts/];

export default defineConfig({
  testDir: './e2e',
  // Overflow is deterministic; retrying would only hide a real failure.
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    // MOBILE_AUDIT_LEAN=1: the design-audit sweep fails by design on many
    // routes; per-failure traces/screenshots would fill the disk.
    trace: process.env.MOBILE_AUDIT_LEAN === '1' ? 'off' : 'retain-on-failure',
    screenshot: process.env.MOBILE_AUDIT_LEAN === '1' ? 'off' : 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      // This preset is the first-generation SE (320x568), a deliberately
      // strict layout stress test. Interaction tests also use 375/390px.
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    // Additional phone widths, local audit runs only (skipped when CI is set:
    // ~4x the sweep runtime for findings that are non-fatal there anyway).
    // Only the layout sweeps run here: the interaction/gesture specs pin their
    // own viewport, so repeating them per project adds no coverage.
    ...(process.env.CI ? [] : [{
      name: 'Android 360',
      testMatch: PHONE_SWEEP,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } },
    },
    {
      // 375 gets the public sweep and overlays only; the full route sweep
      // runs on 320/360/390/430, which bracket it.
      name: 'iPhone 375',
      testMatch: [/mobile-overflow\.spec\.ts/, /mobile-overlays\.spec\.ts/],
      use: { ...devices['iPhone X'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'iPhone 390',
      testMatch: PHONE_SWEEP,
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'iPhone 430',
      testMatch: PHONE_SWEEP,
      use: { ...devices['iPhone 14 Pro Max'], viewport: { width: 430, height: 932 } },
    }]),
    {
      // 768 is the `md` breakpoint itself — where layouts switch, and where
      // off-by-one breakpoint bugs actually live.
      name: 'iPad Mini',
      use: { ...devices['iPad Mini'] },
    },
  ],

  // `vite preview` serves the production build, which is what ships. A dev
  // server would test un-minified output with different CSS ordering.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
