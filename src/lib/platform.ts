/**
 * Platform abstraction — the single source of truth about the runtime environment.
 *
 * The app ships as a web SPA (Vercel) AND as a native iOS/Android app (Capacitor).
 * Inside a Capacitor WebView `window.location.origin` is `capacitor://localhost`
 * (iOS) or `http://localhost` (Android), which is useless for:
 *   - OAuth / magic-link / password-reset redirects (Google rejects non-https)
 *   - shareable, printed or emailed URLs (QR codes, labels, customer mails)
 *
 * Every module that needs an absolute URL must go through this file.
 * Direct `window.location.origin` usage outside this module is a lint error.
 */
import { Capacitor } from '@capacitor/core';

export type AppPlatform = 'ios' | 'android' | 'web';

/** Canonical public origin — used for anything a human or another system will see. */
const PUBLIC_BASE_URL = (
  import.meta.env.VITE_PUBLIC_BASE_URL || 'https://trackbliss.eu'
).replace(/\/+$/, '');

/** True when running inside the Capacitor native shell (iOS or Android). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Whether the native first-run surfaces (intro journey, guest mode) should mount.
 *
 * Deliberately NOT `isNative()`. That predicate decides auth redirect origins
 * and the URLs baked into printed QR codes, so it must never be forceable from
 * the client — a query param or localStorage switch on it would let any web
 * visitor change where auth redirects point.
 *
 * This one gates a purely visual surface, and it is a BUILD-TIME flag: Vite
 * inlines `import.meta.env.VITE_E2E_FIRST_RUN` statically, so in both shipping
 * builds (Vercel and `build:native`, neither of which sets it) the comparison
 * folds to false and the whole expression collapses to `isNative()` — there is
 * no runtime switch a visitor could reach.
 *
 * To be precise about what this does NOT do: the lazily-imported guest chunks
 * are still emitted by the bundler, because they are ordinary route modules.
 * They are simply never fetched on the web, since `NativeOnly` redirects before
 * the nested routes render. The saving is reachability, not bytes on the CDN.
 *
 * An `import.meta.env.DEV` guard would not work here: Playwright serves a
 * production `vite preview` build, where DEV is false — so a DEV-only hatch is
 * untestable in the exact harness that needs it.
 */
export function showsFirstRun(): boolean {
  return isNative() || import.meta.env.VITE_E2E_FIRST_RUN === '1';
}

export function getPlatform(): AppPlatform {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : 'web';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

/**
 * Origin for URLs that LEAVE the app: QR codes, printed labels, emails,
 * portal links, share sheets, embed snippets.
 *
 * Web: the current origin, so preview/staging deployments stay self-consistent.
 * Native: always the canonical public domain — never `capacitor://localhost`,
 * which would otherwise be baked into printed QR codes and customer mails.
 */
export function getPublicBaseUrl(): string {
  if (isNative()) return PUBLIC_BASE_URL;
  if (typeof window === 'undefined') return PUBLIC_BASE_URL;
  return window.location.origin;
}

/** Build an absolute public URL from an app-relative path. */
export function publicUrl(path: string): string {
  const base = getPublicBaseUrl();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/**
 * Redirect target for Supabase auth flows (OAuth, magic link, password reset).
 *
 * Native uses the SAME https URL as the web build. That is deliberate: it is
 * served by Universal Links (iOS) / App Links (Android), so no extra entries are
 * needed in the Supabase redirect allow-list or the Google Cloud Console, and
 * Google never sees a non-https scheme (which it rejects for web clients).
 */
export function getAuthRedirectUrl(path: string): string {
  const base = isNative()
    ? PUBLIC_BASE_URL
    : typeof window !== 'undefined'
      ? window.location.origin
      : PUBLIC_BASE_URL;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/**
 * Origin for URLs that come back INTO the app (auth callbacks, Stripe return URLs).
 *
 * Identical to `getAuthRedirectUrl`'s base. Kept as its own helper so call sites
 * read as "where does the user land back in the app", not "what do we print".
 */
export function getAuthOrigin(): string {
  if (isNative()) return PUBLIC_BASE_URL;
  if (typeof window === 'undefined') return PUBLIC_BASE_URL;
  return window.location.origin;
}
