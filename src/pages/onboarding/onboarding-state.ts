/**
 * First-run onboarding flag.
 *
 * Stored in Capacitor Preferences (UserDefaults / SharedPreferences) rather
 * than localStorage: WKWebView can evict localStorage under storage pressure,
 * which would show the intro tour again to a long-time user for no reason.
 *
 * Every read fails *closed* (returns "already completed"). A storage error must
 * never be able to trap someone behind an onboarding screen they cannot pass.
 */
import { Preferences } from '@capacitor/preferences';

export const ONBOARDING_KEY = 'onboarding.v1.completed';

/** True when the intro tour has been seen (or when we cannot tell). */
export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
    return value === 'true';
  } catch {
    return true;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
  } catch {
    // Storage unavailable — the tour simply shows again next launch.
  }
}

/** Used by the "replay the tour" entry point in Help & Support. */
export async function resetOnboarding(): Promise<void> {
  try {
    await Preferences.remove({ key: ONBOARDING_KEY });
  } catch {
    // Nothing to do — the caller navigates to /onboarding regardless.
  }
}
