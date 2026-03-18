/**
 * Central Edge Function Wrapper
 *
 * Ensures session is refreshed before invoking any Supabase Edge Function,
 * preventing 401 errors from expired JWT tokens (1h TTL).
 */

import { supabase } from './supabase';

/**
 * Invoke a Supabase Edge Function with automatic session refresh.
 * Refreshes the JWT before each call to prevent expired-token 401s.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  // Refresh session to ensure valid JWT
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn(`[edge-function] Session refresh failed for ${functionName}:`, refreshError.message);
    // Continue anyway — the token might still be valid
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    // Extract real error from edge function response context
    const detail = extractEdgeFunctionError(error, data);
    return { data: null, error: new Error(detail) };
  }

  return { data: data as T, error: null };
}

/**
 * Extract the real error message from a Supabase Edge Function error.
 * When an edge function returns non-2xx, supabase-js wraps the response
 * in error.context (which contains the JSON body with the real error).
 */
function extractEdgeFunctionError(
  error: { message?: string; context?: unknown },
  data?: unknown
): string {
  // Check if the data itself contains an error (sometimes returned alongside error)
  if (data && typeof data === 'object' && 'error' in data) {
    const d = data as Record<string, unknown>;
    if (typeof d.error === 'string') return d.error;
  }

  try {
    const ctx = error.context;
    if (ctx && typeof ctx === 'object') {
      const obj = ctx as Record<string, unknown>;

      // Check for 401 specifically — likely expired session
      if (obj.status === 401) {
        return 'Session expired. Please refresh the page and try again.';
      }

      if (typeof obj.error === 'string') return obj.error;

      // Try to read JSON body from Response-like context
      if (typeof obj.json === 'function') {
        // Can't await here in sync extraction, fall through
      }
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

  // Detect 401 from error message as fallback
  const msg = error.message || 'Unknown error';
  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Session expired. Please refresh the page and try again.';
  }

  return msg;
}
