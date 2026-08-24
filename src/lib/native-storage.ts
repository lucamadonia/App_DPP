/**
 * Supabase auth storage adapter backed by Capacitor Preferences.
 *
 * Why not localStorage on native: WKWebView's localStorage can be evicted by
 * iOS under storage pressure, which logs the user out for no apparent reason.
 * Preferences maps to UserDefaults / SharedPreferences and survives that.
 *
 * On web this module is never used — the default localStorage driver stays,
 * so existing sessions keep working with no migration.
 */
import { Preferences } from '@capacitor/preferences';

/** Matches the shape supabase-js expects for `auth.storage`. */
export const capacitorAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};
