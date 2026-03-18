/**
 * Central Edge Function Wrapper
 *
 * Ensures session is refreshed before invoking any Supabase Edge Function,
 * preventing 401 errors from expired JWT tokens (1h TTL).
 */

import { supabase } from './supabase';

/**
 * Invoke a Supabase Edge Function with automatic session refresh.
 * 1. Check current session — if expired or about to expire, refresh first
 * 2. Invoke the edge function
 * 3. On 401, retry once after forced refresh
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

    // Step 3: On 401, retry once after forced refresh
    if (is401) {
      console.warn(`[edge-function] 401 from ${functionName}, retrying after session refresh...`);
      const refreshed = await forceRefreshSession();
      if (!refreshed) {
        return { data: null, error: new Error('Sitzung abgelaufen. Bitte neu einloggen.') };
      }

      // Retry the call
      const { data: retryData, error: retryError } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (retryError) {
        const detail = extractEdgeFunctionError(retryError, retryData);
        return { data: null, error: new Error(detail) };
      }

      return { data: retryData as T, error: null };
    }

    // Non-401 error
    const detail = extractEdgeFunctionError(error, data);
    return { data: null, error: new Error(detail) };
  }

  return { data: data as T, error: null };
}

/**
 * Ensure we have a valid (non-expired) session.
 * Proactively refreshes if token expires within 2 minutes.
 */
async function ensureValidSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // No session — let the invoke fail naturally

    // Check if token expires within the next 2 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const twoMinutes = 2 * 60 * 1000;

    if (expiresAt > 0 && expiresAt - Date.now() < twoMinutes) {
      console.log('[edge-function] Token expiring soon, proactively refreshing...');
      await supabase.auth.refreshSession();
    }
  } catch (err) {
    console.warn('[edge-function] ensureValidSession error:', err);
  }
}

/**
 * Force a session refresh. Returns true if successful.
 */
async function forceRefreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.error('[edge-function] Force refresh failed:', error?.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[edge-function] Force refresh exception:', err);
    return false;
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
