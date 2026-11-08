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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // This preset is the first-generation SE (320x568), a deliberately
      // strict layout stress test. Interaction tests also use 375/390px.
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
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
