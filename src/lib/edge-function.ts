/**
 * Central Edge Function Wrapper
 *
 * All edge function calls go through raw fetch() with explicit token management.
 * supabase.functions.invoke() has a known issue where it uses a stale token
 * from its internal cache, causing persistent 401 errors.
 */

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Invoke a Supabase Edge Function with explicit token management.
 * 1. Get current access token directly from session
 * 2. Call edge function via raw fetch() with explicit headers
 * 3. On 401, refresh session and retry once with fresh token
 * 4. Never auto-logout — just return the error to the caller
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  // Step 1: Get current access token
  const token = await getAccessToken();
  if (!token) {
    return { data: null, error: new Error('Nicht eingeloggt.') };
  }

  // Step 2: Call edge function with explicit token
  const result = await callEdgeFunction<T>(functionName, body, token);

  // Step 3: On 401, refresh and retry once
  if (result.status === 401) {
    console.warn(`[edge-function] 401 from ${functionName}, refreshing session...`);
    const freshToken = await forceRefreshSession();
    if (!freshToken) {
      console.error(`[edge-function] Session refresh failed for ${functionName}`);
      return { data: null, error: new Error('Sitzung konnte nicht erneuert werden. Bitte Seite neu laden.') };
    }

    console.log(`[edge-function] Retrying ${functionName} with fresh token`);
    const retryResult = await callEdgeFunction<T>(functionName, body, freshToken);

    if (retryResult.status === 401) {
      // Still 401 after refresh — something else is wrong, but do NOT log out
      console.error(`[edge-function] Still 401 after refresh for ${functionName}`);
      return { data: null, error: new Error('Authentifizierungsfehler. Bitte Seite neu laden und erneut versuchen.') };
    }

    if (retryResult.error) {
      return { data: null, error: new Error(retryResult.error) };
    }

    return { data: retryResult.data as T, error: null };
  }

  // Non-401 error
  if (result.error) {
    return { data: null, error: new Error(result.error) };
  }

  return { data: result.data as T, error: null };
}

/**
 * Get the current access token from the Supabase session.
 * Proactively refreshes if the token expires within 5 minutes.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Proactively refresh if token expires within 5 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const fiveMinutes = 5 * 60 * 1000;
    const timeUntilExpiry = expiresAt > 0 ? expiresAt - Date.now() : Infinity;

    if (timeUntilExpiry < fiveMinutes) {
      console.log(`[edge-function] Token expires in ${Math.round(timeUntilExpiry / 1000)}s, proactively refreshing...`);
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        return data.session.access_token;
      }
      console.warn('[edge-function] Proactive refresh failed, using existing token');
    }

    return session.access_token;
  } catch (err) {
    console.warn('[edge-function] getAccessToken error:', err);
    return null;
  }
}

/**
 * Call an edge function via raw fetch() with explicit Authorization header.
 * Returns parsed data, error message, and HTTP status.
 */
async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown> | undefined,
  token: string
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    // 401 — signal caller to retry
    if (resp.status === 401) {
      return { data: null, error: 'Unauthorized', status: 401 };
    }

    // Try to parse JSON response
    let respData: T | null = null;
    let respText = '';
    try {
      respText = await resp.text();
      respData = JSON.parse(respText) as T;
    } catch {
      // Not JSON
    }

    // Non-OK status
    if (!resp.ok) {
      let errMsg = `Edge function error ${resp.status}`;
      if (respData && typeof respData === 'object' && 'error' in respData) {
        errMsg = (respData as Record<string, unknown>).error as string;
      } else if (respText) {
        errMsg = respText.slice(0, 300);
      }
      return { data: respData, error: errMsg, status: resp.status };
    }

    // Return data as-is — callers (e.g. callDHL) handle body-level errors
    // themselves because they need access to additional fields like dhlRequest/dhlResponse
    return { data: respData, error: null, status: resp.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[edge-function] fetch error for ${functionName}:`, msg);
    return { data: null, error: msg, status: 0 };
  }
}

/**
 * Force a session refresh. Returns the fresh access token, or null on failure.
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
