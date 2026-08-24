/**
 * Native shell bootstrap: status bar, keyboard insets, splash handoff.
 *
 * The splash chain must be gapless or the user sees a white flash:
 *   native Capacitor splash  ->  #boot-splash in index.html  ->  <AppSplash/>
 * All three paint the same #0F172A, and each is only removed once the next has
 * painted. `launchAutoHide: false` in capacitor.config.ts keeps the native
 * splash up until we explicitly hide it.
 */
import { isNative } from './platform';
import { initNativeKeyboard } from './native-keyboard';

/** Remove the pre-React splash markup from index.html. */
export function removeBootSplash(): void {
  const el = document.getElementById('boot-splash');
  if (!el) return;
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

/**
 * One-time native setup. Safe to call on web — everything inside is guarded.
 * Returns a cleanup function.
 */
export function initNativeShell(): () => void {
  if (!isNative()) return () => {};
  const disposeKeyboard = initNativeKeyboard();
  return () => {
    disposeKeyboard();
  };
}
