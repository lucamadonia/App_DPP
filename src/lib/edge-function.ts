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
 * Decode JWT payload without verification (for debugging only).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

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

  // Debug: log token info
  const payload = decodeJwtPayload(token);
  if (payload) {
    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : 'unknown';
    const role = payload.role || 'unknown';
    const sub = typeof payload.sub === 'string' ? payload.sub.slice(0, 8) + '...' : 'unknown';
    console.log(`[edge-function] Calling ${functionName} | role=${role} sub=${sub} exp=${exp} now=${new Date().toISOString()}`);
  }

  // Step 2: Call edge function with explicit token
  const result = await callEdgeFunction<T>(functionName, body, token);

  // Step 3: On 401, refresh and retry once
  if (result.status === 401) {
    console.warn(`[edge-function] 401 from ${functionName} | resp body: ${result.responseBody?.slice(0, 200)}`);

    // First, try a no-auth ping to check if the function is even reachable
    const pingOk = await pingEdgeFunction(functionName);
    console.log(`[edge-function] Ping ${functionName} (no-auth): ${pingOk ? 'OK' : 'FAILED'}`);

    const freshToken = await forceRefreshSession();
    if (!freshToken) {
      console.error(`[edge-function] Session refresh failed for ${functionName}`);
      return { data: null, error: new Error('Sitzung konnte nicht erneuert werden. Bitte Seite neu laden.') };
    }

    // Debug: log fresh token info
    const freshPayload = decodeJwtPayload(freshToken);
    if (freshPayload) {
      const exp = typeof freshPayload.exp === 'number' ? new Date(freshPayload.exp * 1000).toISOString() : 'unknown';
      console.log(`[edge-function] Fresh token exp=${exp} role=${freshPayload.role}`);
    }

    console.log(`[edge-function] Retrying ${functionName} with fresh token`);
    const retryResult = await callEdgeFunction<T>(functionName, body, freshToken);

    if (retryResult.status === 401) {
      console.error(`[edge-function] Still 401 after refresh for ${functionName} | resp: ${retryResult.responseBody?.slice(0, 200)}`);

      // Try calling via supabase.functions.invoke as absolute fallback
      console.log(`[edge-function] Trying supabase.functions.invoke as fallback...`);
      try {
        const { data: fbData, error: fbError } = await supabase.functions.invoke(functionName, { body });
        if (fbError) {
          console.error(`[edge-function] Fallback also failed:`, fbError.message);
          return { data: null, error: new Error(`Authentifizierungsfehler bei ${functionName}. Details in Console (F12).`) };
        }
        console.log(`[edge-function] Fallback via supabase.functions.invoke WORKED!`);
        return { data: fbData as T, error: null };
      } catch (fbErr) {
        console.error(`[edge-function] Fallback exception:`, fbErr);
        return { data: null, error: new Error(`Authentifizierungsfehler bei ${functionName}. Details in Console (F12).`) };
      }
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
 * Returns parsed data, error message, HTTP status, and raw response body for debugging.
 */
async function callEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown> | undefined,
  token: string
): Promise<{ data: T | null; error: string | null; status: number; responseBody?: string }> {
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

    // Read raw response body
    const respText = await resp.text();

    // 401 — signal caller to retry
    if (resp.status === 401) {
      return { data: null, error: 'Unauthorized', status: 401, responseBody: respText };
    }

    // Try to parse JSON
    let respData: T | null = null;
    try {
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
      return { data: respData, error: errMsg, status: resp.status, responseBody: respText };
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
 * Ping an edge function without auth to check if it's reachable/deployed.
 * Sends a { action: 'ping' } body and checks for a response.
 */
async function pingEdgeFunction(functionName: string): Promise<boolean> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'ping' }),
    });
    // dhl-shipping's ping action returns 200 with { pong: true }
    // Even a 401 means the function is deployed (gateway reached it)
    console.log(`[edge-function] Ping ${functionName}: status=${resp.status}`);
    if (resp.ok) {
      const data = await resp.json();
      console.log(`[edge-function] Ping response:`, data);
    }
    return resp.status !== 404 && resp.status !== 500;
  } catch {
    return false;
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
