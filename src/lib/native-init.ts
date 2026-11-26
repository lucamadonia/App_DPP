/**
 * Native shell bootstrap: status bar, keyboard insets, splash handoff.
 *
 * The splash chain must be gapless or the user sees a white flash:
 *   native Capacitor splash  ->  #boot-splash in index.html  ->  <AppSplash/>
 * All three paint the same #0F172A, and each is only removed once the next has
 * painted. `launchAutoHide: false` in capacitor.config.ts keeps the native
 * splash up until we explicitly hide it.
 */
import { isAndroid, isNative } from './platform';
import { initNativeKeyboard } from './native-keyboard';

/** Remove the pre-React splash markup from index.html. */
export function removeBootSplash(immediate = false): void {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  if (immediate) {
    el.remove();
    return;
  }
  el.style.transition = 'opacity 180ms ease-out';
  el.style.opacity = '0';
  window.setTimeout(() => el.remove(), 200);
}

/**
 * Hide the native splash screen. Call only once React has actually painted,
 * otherwise the WebView shows a blank frame underneath.
 */
export async function hideNativeSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    // Plugin unavailable — nothing to hide.
  }
}

/** Keep the native status bar in sync with the active theme. */
export async function syncStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
  } catch {
    // Not available (web / plugin missing).
  }
}

/** Root destinations of the bottom tab bar: Back here leaves the app. */
const ROOT_TAB_PATHS = new Set(['/', '/warehouse', '/products', '/returns']);

/**
 * Overlays that own the Back gesture. Every one of them is a Radix
 * DismissableLayer, which closes on an Escape keydown on the document — the
 * same path a hardware keyboard takes, so focus restoration stays correct.
 */
const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
  '[data-slot="select-content"][data-state="open"]',
].join(',');

function closeTopOverlay(): boolean {
  if (!document.querySelector(OPEN_OVERLAY_SELECTOR)) return false;
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
  );
  return true;
}

/** React Router stores the entry index in history.state; 0 = first entry. */
function routerHistoryIndex(): number {
  const state = window.history.state as { idx?: unknown } | null;
  return typeof state?.idx === 'number' ? state.idx : 0;
}

/**
 * Android hardware/gesture Back: close the topmost overlay first, then walk
 * back through in-app history, and only on a root tab (or with nothing to go
 * back to) send the app to the background — never kill it, so a stray Back
 * does not throw away the session and scroll position.
 */
function initAndroidBackButton(): () => void {
  if (!isAndroid()) return () => {};
  let disposed = false;
  let remove: (() => Promise<void>) | null = null;

  void import('@capacitor/app')
    .then(async ({ App }) => {
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (closeTopOverlay()) return;
        const onRootTab = ROOT_TAB_PATHS.has(window.location.pathname.replace(/\/+$/, '') || '/');
        if (!onRootTab && (canGoBack || routerHistoryIndex() > 0)) {
          window.history.back();
          return;
        }
        void App.minimizeApp();
      });
      if (disposed) void handle.remove();
      else remove = () => handle.remove();
    })
    .catch(() => {
      // Plugin unavailable — Android falls back to its default Back handling.
    });

  return () => {
    disposed = true;
    void remove?.();
  };
}

/**
 * One-time native setup. Safe to call on web — everything inside is guarded.
 * Returns a cleanup function.
 */
export function initNativeShell(): () => void {
  if (!isNative()) return () => {};
  document.documentElement.dataset.native = 'true';
  const disposeKeyboard = initNativeKeyboard();
  const disposeBackButton = initAndroidBackButton();
  // The theme hook may have applied before this ran; resync once now.
  void syncStatusBar(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  return () => {
    disposeKeyboard();
    disposeBackButton();
    delete document.documentElement.dataset.native;
  };
}
