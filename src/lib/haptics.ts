/**
 * Lightweight haptic feedback wrapper around the Vibration API.
 * Silently no-ops on devices that don't support it (desktop, older iOS).
 */

function safeVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration blocked or unavailable — no-op
  }
}

export const haptic = {
  /** Subtle 10ms tap — for wizard step-advance, toggle state, list item select */
  light: () => safeVibrate(10),
  /** 20ms — for successful submit, item add, confirmation */
  medium: () => safeVibrate(20),
  /** Short double pulse — for errors or destructive confirmations */
  error: () => safeVibrate([15, 30, 15]),
  /** Success pattern — for completed multi-step flows */
  success: () => safeVibrate([10, 40, 10]),
};
