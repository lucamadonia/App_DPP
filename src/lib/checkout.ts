/**
 * Opening a Stripe Checkout / Billing Portal URL, per platform.
 *
 * Web: a normal top-level navigation, as before.
 *
 * Native: `window.location.href` would replace the app's own WebView with
 * Stripe and leave no way back — the user would have to force-quit. The URL is
 * handed to the system browser instead, and the return trip comes back through
 * the Universal/App Link handler in src/lib/deep-links.ts.
 *
 * See also `nativeHidesPurchases()`: in the native apps the purchase paths
 * are not offered at all (App Store 3.1.1 / Google Play Payments policy).
 */
import { isNative } from './platform';

export async function openCheckoutUrl(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Whether to hide every purchase path in this build (all native platforms).
 *
 * iOS: Apple requires digital goods to be sold through In-App Purchase
 * (guideline 3.1.1). Android: Google Play Payments policy likewise requires
 * Play Billing for in-app consumed digital goods such as AI credits, unless
 * the app is enrolled in alternative / user-choice billing (SRE-15).
 * Rather than implementing store billing for plans and AI credits, the native
 * builds ship as a pure work tool: no prices, no upgrade CTAs, no checkout.
 * Plans are managed on the web.
 *
 * This is a deliberate product decision, not a technical limitation.
 */
export function nativeHidesPurchases(): boolean {
  return isNative();
}

/**
 * @deprecated Use `nativeHidesPurchases()`. Kept as an alias for existing
 * callers; it now covers Android as well as iOS.
 */
export function iosHidesPurchases(): boolean {
  return nativeHidesPurchases();
}
