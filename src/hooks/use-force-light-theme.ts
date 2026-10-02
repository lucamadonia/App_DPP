import { useEffect } from 'react';

/**
 * Locks the document to the light theme while a public surface is mounted.
 *
 * Public portals (returns portal, tracking page, customer portal, DPP pages)
 * are styled by tenant branding with explicit light colours. When the visitor's
 * OS is in dark mode, the global ThemeInitializer would add `.dark` to <html>,
 * flipping the semantic tokens (text-foreground, bg-card, ...) to their dark
 * values while the branded surfaces stay light — white text on white headers.
 *
 * The lock is reference-counted so nested public layouts (e.g. the tracking
 * page rendered inside the custom-domain returns portal) can each request it
 * without the inner one releasing the lock early. A MutationObserver strips
 * `.dark` again if the theme hook re-applies it (system preference change, or
 * the ThemeInitializer mount effect, which runs after child effects).
 */

let lockCount = 0;
let observer: MutationObserver | null = null;
let previousColorScheme = '';

function stripDark(root: HTMLElement) {
  if (root.classList.contains('dark')) root.classList.remove('dark');
}

function restoreUserTheme(root: HTMLElement) {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('theme');
  } catch {
    stored = null;
  }
  const theme = stored === 'light' || stored === 'dark' ? stored : 'system';
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  root.classList.toggle('dark', resolved === 'dark');
}

function acquireLightLock() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  lockCount += 1;
  if (lockCount > 1) return;

  previousColorScheme = root.style.colorScheme;
  root.style.colorScheme = 'light';
  stripDark(root);

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => stripDark(root));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
}

function releaseLightLock() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  const root = document.documentElement;
  observer?.disconnect();
  observer = null;
  root.style.colorScheme = previousColorScheme;
  restoreUserTheme(root);
}

export function useForceLightTheme(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    acquireLightLock();
    return releaseLightLock;
  }, [enabled]);
}
