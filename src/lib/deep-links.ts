/**
 * Native deep-link handling.
 *
 * Universal Links (iOS) / App Links (Android) mean the app opens on the very
 * same https URLs the web build uses — so Supabase's redirect allow-list and
 * the Google Cloud Console need no native-specific entries.
 *
 * Two things arrive here:
 *   1. Auth callbacks (`/auth/callback`, `/auth/reset-password`,
 *      `/customer/:slug/auth/callback`) carrying a PKCE `code` or an implicit
 *      token fragment. The system browser is closed and the session applied.
 *   2. Ordinary content links (`/p/...`, `/t/...`) — routed in-app.
 */
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { supabase } from './supabase';
import { isNative } from './platform';

/** Called with an in-app path so the router can navigate to it. */
type Navigate = (path: string) => void;

const AUTH_CALLBACK_PATHS = ['/auth/callback', '/auth/reset-password'];

function isAuthCallback(pathname: string): boolean {
  return (
    AUTH_CALLBACK_PATHS.some((p) => pathname.startsWith(p)) ||
    /^\/customer\/[^/]+\/auth\/callback/.test(pathname)
  );
}

async function closeBrowser(): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    // Nothing open, or the plugin already closed it — not an error.
  }
}

/**
 * Apply an auth callback URL to the Supabase client.
 * Returns the path the app should land on, or null if nothing was applied.
 */
async function applyAuthCallback(url: URL): Promise<string | null> {
  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[deep-links] code exchange failed:', error.message);
      return '/login?error=auth';
    }
    return url.pathname.startsWith('/auth/reset-password')
      ? '/auth/reset-password'
      : '/';
  }

  // Implicit flow / recovery links deliver tokens in the fragment.
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.error('[deep-links] setSession failed:', error.message);
      return '/login?error=auth';
    }
    return hash.get('type') === 'recovery' ? '/auth/reset-password' : '/';
  }

  const errorDescription =
    url.searchParams.get('error_description') || hash.get('error_description');
  if (errorDescription) {
    console.error('[deep-links] auth error:', errorDescription);
    return '/login?error=auth';
  }

  return null;
}

/**
 * Register the deep-link listener. No-op on web.
 * Returns a cleanup function.
 */
export function initDeepLinks(navigate: Navigate): () => void {
  if (!isNative()) return () => {};

  const handler = async (event: URLOpenListenerEvent) => {
    let url: URL;
    try {
      url = new URL(event.url);
    } catch {
      return;
    }

    if (isAuthCallback(url.pathname)) {
      const target = await applyAuthCallback(url);
      await closeBrowser();
      if (target) navigate(target);
      return;
    }

    // Ordinary content link — hand the path to the router.
    navigate(url.pathname + url.search);
  };

  const listenerPromise = App.addListener('appUrlOpen', handler);

  return () => {
    void listenerPromise.then((l) => l.remove());
  };
}
