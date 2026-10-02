/**
 * Shared persistent rate limiting + abuse helpers for edge functions.
 *
 * Backed by public.rate_limit_counters / public.rate_limit_hit() from
 * migration 20261001d_rh_notifications_lockdown_ratelimit.sql. The RPC is
 * executable by service_role only, so pass a service-role Supabase client.
 *
 * Usage:
 *   import { enforceRateLimits, getClientIp, hashKey, rateLimitedResponse } from '../_shared/rate-limit.ts';
 *
 *   const ip = getClientIp(req);
 *   const verdict = await enforceRateLimits(supabase, [
 *     { bucket: `myfn:ip:${await hashKey(ip)}`, limit: 20, windowSeconds: 3600 },
 *     { bucket: `myfn:email:${await hashKey(email)}`, limit: 3, windowSeconds: 3600 },
 *   ]);
 *   if (!verdict.allowed) return rateLimitedResponse(verdict.retryAfterSeconds, corsHeaders);
 *
 * Bucket names must be <= 200 chars. Never put raw emails/IPs into a bucket:
 * hash them with hashKey() so the counter table holds no personal data.
 */

// deno-lint-ignore no-explicit-any
type SupabaseLike = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

export interface RateLimitRule {
  /** Unique counter name, e.g. `widerruf:ip:<hash>`. */
  bucket: string;
  /** Max hits allowed inside one window. */
  limit: number;
  /** Fixed window length in seconds (1 .. 604800). */
  windowSeconds: number;
  /** Hits to add, default 1. */
  cost?: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
  /** Bucket of the first rule that was exceeded. */
  exceeded?: string;
  /** True when the check could not run (DB error) and the call failed open. */
  degraded?: boolean;
}

export interface RateLimitOptions {
  /**
   * When the counter RPC fails (e.g. migration not applied yet): allow the
   * request (true, default) or block it (false). Fail open for legally
   * required flows, fail closed for cost-bearing ones.
   */
  failOpen?: boolean;
}

/** SHA-256 hex (first 32 chars) of a normalised value, for PII-free bucket names. */
export async function hashKey(value: string): Promise<string> {
  const data = new TextEncoder().encode(String(value ?? '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * Best-effort client IP behind the Supabase gateway. Returns 'unknown' when absent.
 *
 * Never trusts the FIRST X-Forwarded-For entry: the platform proxies append to
 * a client-supplied XFF header, so that entry is attacker-controlled and would
 * let one client rotate through unlimited "IPs". Order: cf-connecting-ip (set
 * by Cloudflare, overwrites client values) → right-most XFF hop (added by the
 * last proxy) → x-real-ip.
 */
export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/** Count one hit on a single bucket. */
export async function checkRateLimit(
  supabase: SupabaseLike,
  rule: RateLimitRule,
  opts: RateLimitOptions = {},
): Promise<RateLimitVerdict> {
  const failOpen = opts.failOpen ?? true;
  try {
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_bucket: rule.bucket.slice(0, 200),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
      p_cost: rule.cost ?? 1,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('rate_limit_hit returned no row');
    return {
      allowed: row.allowed === true,
      retryAfterSeconds: Number(row.retry_after_seconds) || 0,
      exceeded: row.allowed === true ? undefined : rule.bucket,
    };
  } catch (err) {
    console.error(`[rate-limit] check failed for ${rule.bucket.split(':').slice(0, 2).join(':')}:`, err);
    return { allowed: failOpen, retryAfterSeconds: failOpen ? 0 : 60, degraded: true };
  }
}

/**
 * Evaluate several rules in order and stop at the first exceeded one.
 * Every evaluated rule counts the hit, so put the cheapest/broadest
 * (per-IP) rule first.
 */
export async function enforceRateLimits(
  supabase: SupabaseLike,
  rules: RateLimitRule[],
  opts: RateLimitOptions = {},
): Promise<RateLimitVerdict> {
  let degraded = false;
  for (const rule of rules) {
    const verdict = await checkRateLimit(supabase, rule, opts);
    if (verdict.degraded) degraded = true;
    if (!verdict.allowed) return verdict;
  }
  return { allowed: true, retryAfterSeconds: 0, degraded: degraded || undefined };
}

/** Standard 429 response with Retry-After. */
export function rateLimitedResponse(
  retryAfterSeconds: number,
  headers: Record<string, string> = {},
  message = 'Too many requests. Please try again later.',
): Response {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds || 60));
  return new Response(JSON.stringify({ error: 'rate_limited', message, retry_after_seconds: retry }), {
    status: 429,
    headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(retry) },
  });
}

/**
 * Cloudflare Turnstile verification. Active only when TURNSTILE_SECRET_KEY is
 * set, so the secret must be configured AFTER the frontend sends tokens.
 * Returns 'skipped' when not configured, 'ok' or 'failed' otherwise.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string,
): Promise<'ok' | 'failed' | 'skipped'> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY') || '';
  if (!secret) return 'skipped';
  if (!token || typeof token !== 'string' || token.length > 2048) return 'failed';
  try {
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip && ip !== 'unknown') form.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const out = await res.json().catch(() => ({}));
    return out?.success === true ? 'ok' : 'failed';
  } catch (err) {
    console.error('[rate-limit] turnstile verify failed:', err);
    return 'failed';
  }
}

/** Constant-time string comparison for shared secrets / bearer tokens. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
