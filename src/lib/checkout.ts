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
 * See also `iosHidesPurchases()`: on iOS the purchase paths should not be
 * offered at all (App Store guideline 3.1.1).
 */
import { isNative, isIOS } from './platform';

export async function openCheckoutUrl(url: string): Promise<void> {
  if (!isNative()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Whether to hide every purchase path in this build.
 *
 * Apple requires digital goods to be sold through In-App Purchase. Rather than
 * implementing IAP for plans and AI credits, the iOS build ships as a pure
 * work tool: no prices, no upgrade CTAs, no checkout. Plans are managed on the
 * web. Android keeps Stripe — Google permits it for B2B SaaS.
 *
 * This is a deliberate product decision, not a technical limitation.
 */
export function iosHidesPurchases(): boolean {
  return isNative() && isIOS();
}
