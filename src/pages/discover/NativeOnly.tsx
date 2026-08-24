import { Navigate, Outlet } from 'react-router-dom';
import { showsFirstRun } from '@/lib/platform';

/**
 * Route guard for guest mode.
 *
 * Guest mode is a native-app feature. On the web build these URLs must behave
 * exactly as they did before it existed: an unauthenticated visitor lands on
 * /login. Redirecting here, before any guest chrome mounts, means the browser
 * never paints a frame of a screen it does not ship.
 *
 * Imported eagerly on purpose — lazy-loading a guard would make the web bundle
 * download a chunk purely in order to redirect.
 *
 * Note the deliberate asymmetry this creates for deep links: a Universal Link
 * to /discover opens guest mode in the app but redirects to /login on the web.
 * That follows from "native only"; the honest fix, if parity is ever wanted, is
 * a web-side marketing page rather than opening guest mode in a browser.
 */
export function NativeOnly() {
  if (!showsFirstRun()) return <Navigate to="/login" replace />;
  return <Outlet />;
}
