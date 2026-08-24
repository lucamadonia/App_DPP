/**
 * Haptic feedback, mapped to interaction classes rather than raw durations.
 *
 * The public API is unchanged from the original Vibration-API version so every
 * existing call site keeps working — only the implementation moved.
 *
 * Why it had to move: `navigator.vibrate` is not supported in iOS WKWebView.
 * On iPhone this module was a silent no-op, which is precisely the platform
 * where haptics carry the most of the "feels native" impression.
 *
 * Native  -> @capacitor/haptics (Taptic Engine / Android vibrator)
 * Web     -> navigator.vibrate where available, otherwise a no-op
 */
import { isNative } from './platform';

const STORAGE_KEY = 'haptics-enabled';

/** User-facing opt-out. Defaults to on. */
export function hapticsEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage unavailable — the setting simply does not persist.
  }
}

function webVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Blocked or unavailable.
  }
}

type ImpactLevel = 'Light' | 'Medium' | 'Heavy';
type NotifyLevel = 'Success' | 'Warning' | 'Error';

async function nativeImpact(style: ImpactLevel): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // Plugin missing — fall silent rather than break the interaction.
  }
}

async function nativeNotify(type: NotifyLevel): Promise<void> {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // Plugin missing.
  }
}

function impact(style: ImpactLevel, fallback: number | number[]): void {
  if (!hapticsEnabled()) return;
  if (isNative()) void nativeImpact(style);
  else webVibrate(fallback);
}

function notify(type: NotifyLevel, fallback: number | number[]): void {
  if (!hapticsEnabled()) return;
  if (isNative()) void nativeNotify(type);
  else webVibrate(fallback);
}

export const haptic = {
  /** Selection: tab change, toggle, list item, picker tick. */
  light: () => impact('Light', 10),
  /** Activation: primary button, submit, item added, sheet snap. */
  medium: () => impact('Medium', 20),
  /** Heavy commit: drag-dismiss, swipe-back commit. */
  heavy: () => impact('Heavy', 30),
  /** Completed flow: finished scan, wizard done, picking complete. */
  success: () => notify('Success', [10, 40, 10]),
  /** Validation error, failed scan. */
  error: () => notify('Error', [15, 30, 15]),
  /** Non-blocking warning. */
  warning: () => notify('Warning', [12, 25, 12]),
};
