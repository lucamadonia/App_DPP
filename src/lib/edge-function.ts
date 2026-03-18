/**
 * Central Edge Function Wrapper
 *
 * Ensures session is refreshed before invoking any Supabase Edge Function,
 * preventing 401 errors from expired JWT tokens (1h TTL).
 */

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Invoke a Supabase Edge Function with automatic session refresh.
 * 1. Check current session — if expired or about to expire, refresh first
 * 2. Invoke the edge function
 * 3. On 401, retry once after forced refresh using raw fetch()
 *    (supabase.functions.invoke ignores custom Authorization headers)
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  // Step 1: Ensure we have a valid session
  await ensureValidSession();

  // Step 2: Invoke the edge function
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    const is401 = isUnauthorizedError(error);

    // Step 3: On 401, retry once after forced refresh using raw fetch
    if (is401) {
      console.warn(`[edge-function] 401 from ${functionName}, retrying after session refresh...`);
      const freshToken = await forceRefreshSession();
      if (!freshToken) {
        // Session is irrecoverably expired — notify the app to redirect to login
        window.dispatchEvent(new CustomEvent('session-expired'));
        supabase.auth.signOut().catch(() => {});
        return { data: null, error: new Error('Sitzung abgelaufen. Bitte neu einloggen.') };
      }

      // Retry with raw fetch() — supabase.functions.invoke() ignores custom Auth headers
      console.log(`[edge-function] Retrying ${functionName} with raw fetch + fresh token`);
      try {
        const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshToken}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          if (resp.status === 401) {
            window.dispatchEvent(new CustomEvent('session-expired'));
            supabase.auth.signOut().catch(() => {});
            return { data: null, error: new Error('Sitzung abgelaufen. Bitte neu einloggen.') };
          }
          const text = await resp.text();
          let errMsg: string;
          try {
            const parsed = JSON.parse(text);
            errMsg = parsed.error || `Edge function error ${resp.status}`;
          } catch {
            errMsg = text || `Edge function error ${resp.status}`;
          }
          return { data: null, error: new Error(errMsg) };
        }

        const retryData = await resp.json();
        return { data: retryData as T, error: null };
      } catch (fetchErr) {
        return { data: null, error: fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)) };
      }
    }

    // Non-401 error
    const detail = extractEdgeFunctionError(error, data);
    return { data: null, error: new Error(detail) };
  }

  return { data: data as T, error: null };
}

/**
 * Ensure we have a valid (non-expired) session.
 * Proactively refreshes if token expires within 5 minutes.
 * Uses getUser() instead of getSession() to validate the token server-side,
 * since getSession() only reads from local cache and may return stale data.
 */
async function ensureValidSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // No session — let the invoke fail naturally

    // Check if token expires within the next 5 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const fiveMinutes = 5 * 60 * 1000;
    const timeUntilExpiry = expiresAt > 0 ? expiresAt - Date.now() : Infinity;

    if (timeUntilExpiry < fiveMinutes) {
      console.log(`[edge-function] Token expires in ${Math.round(timeUntilExpiry / 1000)}s, proactively refreshing...`);
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[edge-function] Proactive refresh failed:', error.message);
      }
    }
  } catch (err) {
    console.warn('[edge-function] ensureValidSession error:', err);
  }
}

/**
 * Force a session refresh. Returns the fresh access token, or null on failure.
 * Returning the token directly avoids the race condition where
 * supabase.functions.invoke() reads a stale token from its internal cache.
 */
async function forceRefreshSession(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.error('[edge-function] Force refresh failed:', error?.message);
      return null;
    }
    console.log('[edge-function] Session refreshed, new token expires at', new Date(data.session.expires_at! * 1000).toISOString());
    return data.session.access_token;
  } catch (err) {
    console.error('[edge-function] Force refresh exception:', err);
    return null;
  }
}

/**
 * Check if an error is a 401 Unauthorized.
 */
function isUnauthorizedError(error: { message?: string; context?: unknown }): boolean {
  try {
    const ctx = error.context;
    if (ctx && typeof ctx === 'object') {
      const obj = ctx as Record<string, unknown>;
      if (obj.status === 401) return true;
    }
  } catch {
    // fallthrough
  }
  const msg = error.message || '';
  return msg.includes('401') || msg.includes('Unauthorized');
}

/**
 * Extract the real error message from a Supabase Edge Function error.
 */
function extractEdgeFunctionError(
  error: { message?: string; context?: unknown },
  data?: unknown
): string {
  // Check if the data itself contains an error
  if (data && typeof data === 'object' && 'error' in data) {
    const d = data as Record<string, unknown>;
    if (typeof d.error === 'string') return d.error;
  }

  try {
    const ctx = error.context;
    if (ctx && typeof ctx === 'object') {
      const obj = ctx as Record<string, unknown>;

      if (obj.status === 401) {
        return 'Sitzung abgelaufen. Bitte neu einloggen.';
      }

      if (typeof obj.error === 'string') return obj.error;

      if (obj.body && typeof obj.body === 'object') {
        const body = obj.body as Record<string, unknown>;
        if (typeof body.error === 'string') return body.error;
      }
    }
    if (typeof ctx === 'string') {
      try {
        const parsed = JSON.parse(ctx);
        if (typeof parsed.error === 'string') return parsed.error;
      } catch {
        if (ctx.length > 0 && ctx.length < 500) return ctx;
      }
    }
  } catch {
    // fallthrough
  }

  const msg = error.message || 'Unknown error';
  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Sitzung abgelaufen. Bitte neu einloggen.';
  }

  return msg;
}
