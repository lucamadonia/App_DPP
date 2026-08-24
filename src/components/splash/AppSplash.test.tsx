import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Guards the splash handoff order.
 *
 * The app paints three opaque layers in sequence — the native Capacitor splash,
 * the inline #boot-splash in index.html, then this component — precisely so
 * that something opaque is always on screen and the user never sees a white
 * flash. That only holds if the teardown happens in the right order, and only
 * after React has actually painted.
 *
 * The order is invisible in review and easy to "simplify" away, which is what
 * this test exists to prevent. It is deliberately about sequencing, not looks.
 */

const calls: string[] = [];

vi.mock('@/lib/native-init', () => ({
  hideNativeSplash: vi.fn(async () => {
    calls.push('hideNativeSplash');
  }),
  removeBootSplash: vi.fn(() => {
    calls.push('removeBootSplash');
  }),
}));

vi.mock('@/lib/platform', () => ({
  isNative: () => true,
}));

vi.mock('@/hooks/use-branding', () => ({
  useBranding: () => ({ branding: { logo: null } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { AppSplash } from './AppSplash';

describe('AppSplash handoff', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides the native splash before removing the boot splash', async () => {
    render(
      <AppSplash ready={false} budget="full">
        <div>app</div>
      </AppSplash>
    );

    await waitFor(() => expect(calls).toContain('removeBootSplash'));

    // Order is the whole point: removing #boot-splash while the native splash
    // is still up is harmless, but the reverse leaves a gap with nothing opaque
    // on screen.
    expect(calls.indexOf('hideNativeSplash')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('hideNativeSplash')).toBeLessThan(calls.indexOf('removeBootSplash'));
  });

  it('renders its children immediately, so the app mounts behind the splash', () => {
    render(
      <AppSplash ready={false} budget="full">
        <div>app content</div>
      </AppSplash>
    );

    // The splash is an overlay, never a gate. If children only rendered after
    // it cleared, the 550 ms floor would become 550 ms of dead time.
    expect(screen.getByText('app content')).toBeInTheDocument();
  });

  it('does not tear anything down synchronously on mount', () => {
    render(
      <AppSplash ready={false} budget="full">
        <div>app</div>
      </AppSplash>
    );

    // The handoff waits two animation frames so React has genuinely painted
    // first. Firing during the commit would remove #boot-splash before this
    // component is on screen, which is the exact white flash the chain exists
    // to prevent.
    expect(calls).toEqual([]);
  });

  it('paints an opaque overlay while it is up', () => {
    const { container } = render(
      <AppSplash ready={false} budget="full">
        <div>app</div>
      </AppSplash>
    );

    const overlay = container.querySelector('[class*="fixed inset-0"]') as HTMLElement | null;
    expect(overlay).not.toBeNull();
    // #0F172A, which jsdom normalises to rgb(). This must match #boot-splash in
    // index.html and SplashScreen.backgroundColor in capacitor.config.ts — if
    // the three ever diverge, the seam between them becomes visible.
    const bg = overlay!.style.background.toLowerCase();
    expect(bg === '#0f172a' || bg.includes('rgb(15, 23, 42)')).toBe(true);
  });
});
