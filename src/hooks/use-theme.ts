import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { syncStatusBar } from '@/lib/native-init';
import { applyAppStyle, getStoredAppStyle } from '@/lib/app-styles';
import { transitionAppearance, type RevealOrigin } from '@/lib/appearance-transition';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
/** Keeps every useTheme() instance (App, sidebar, settings) in step. */
const THEME_EVENT = 'theme-change';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Re-apply the device's app style so its light/dark chrome colour follows.
  applyAppStyle(getStoredAppStyle());
  // Status bar text must contrast with the page behind it (no-op on web).
  void syncStatusBar(resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  /**
   * @param origin Where the user tapped; the new theme reveals from there.
   */
  const setTheme = useCallback((newTheme: Theme, origin?: RevealOrigin) => {
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      /* private mode: still applies for this session */
    }
    transitionAppearance(() => {
      applyTheme(newTheme);
      // Commit React state inside the snapshot so icons/labels flip with it.
      flushSync(() => {
        setThemeState(newTheme);
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: newTheme }));
      });
    }, origin);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow changes made through another useTheme() instance.
  useEffect(() => {
    const handler = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  const toggleTheme = useCallback(
    (origin?: RevealOrigin) => {
      setTheme(resolvedTheme === 'light' ? 'dark' : 'light', origin);
    },
    [resolvedTheme, setTheme]
  );

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
