/**
 * Shared guard for the chatbot-* edge functions (EF-09).
 *
 * The chatbot endpoints are called server-to-server by the support bot with
 * the public anon key (verify_jwt = true only proves "some Supabase key").
 * Every lookup can confirm whether an order/return/ticket number belongs to an
 * email address, so each call must:
 *   1. carry the shared secret in `x-chatbot-secret` (CHATBOT_SHARED_SECRET,
 *      constant-time compare). Fails CLOSED with 503 when the secret is not
 *      configured, so a fresh deploy never exposes an open oracle.
 *   2. pass persistent rate limits per IP, per email, per tenant and per
 *      (tenant, reference number) pair, the last one capping email guesses
 *      against one known order number.
 *   3. answer "not found" with one uniform message whether the tenant, the
 *      reference or the email was wrong (see NOT_FOUND_MESSAGE).
 */
import {
  enforceRateLimits,
  getClientIp,
  hashKey,
  rateLimitedResponse,
  timingSafeEqual,
  type RateLimitRule,
} from './rate-limit.ts';

type SupabaseLike = Parameters<typeof enforceRateLimits>[0];

export const chatbotCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-chatbot-secret',
};

/** Identical for unknown tenant, unknown reference and email mismatch. */
export const NOT_FOUND_MESSAGE =
  'Zu diesen Angaben konnte ich leider nichts finden. Bitte prüfe die Nummer und die E-Mail-Adresse.';

export function chatbotJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...chatbotCorsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Returns a Response when the request must be rejected, otherwise null.
 * The secret is read per call so tests and secret rotation need no restart.
 */
export function checkChatbotSecret(req: Request): Response | null {
  const secret = Deno.env.get('CHATBOT_SHARED_SECRET') || '';
  if (!secret) {
    console.error('[chatbot-guard] CHATBOT_SHARED_SECRET is not set; rejecting request');
    return chatbotJson({ error: 'Service unavailable' }, 503);
  }
  const provided = req.headers.get('x-chatbot-secret') || '';
  if (!provided || !timingSafeEqual(provided, secret)) {
    return chatbotJson({ error: 'Forbidden' }, 403);
  }
  return null;
}

export interface ChatbotLimitInput {
  /** Short function id used in bucket names, e.g. 'lookup'. */
  fn: string;
  email?: string;
  tenantSlug?: string;
  /** Order/return/ticket number the caller asks about. */
  reference?: string;
}

/**
 * Persistent throttling for lookup calls. Fails closed on a counter outage:
 * the lookups read from the same database, so an outage breaks them anyway,
 * and an unthrottled oracle is the worse failure.
 * Returns a 429 Response when a limit is exceeded, otherwise null.
 */
export async function enforceChatbotLimits(
  supabase: SupabaseLike,
  req: Request,
  input: ChatbotLimitInput,
): Promise<Response | null> {
  const ipLimit = Math.max(
    1,
    parseInt(Deno.env.get('CHATBOT_IP_LIMIT_PER_HOUR') || '60', 10) || 60,
  );
  const fn = input.fn.replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'chatbot';
  const rules: RateLimitRule[] = [
    { bucket: `chatbot:${fn}:ip:${await hashKey(getClientIp(req))}`, limit: ipLimit, windowSeconds: 3600 },
  ];
  if (input.email) {
    rules.push({ bucket: `chatbot:${fn}:email:${await hashKey(input.email)}`, limit: 20, windowSeconds: 3600 });
  }
  if (input.tenantSlug) {
    rules.push({
      bucket: `chatbot:${fn}:tenant:${await hashKey(input.tenantSlug)}`,
      limit: 300,
      windowSeconds: 3600,
    });
  }
  if (input.tenantSlug && input.reference) {
    // Caps email guessing against one known reference number.
    rules.push({
      bucket: `chatbot:${fn}:ref:${await hashKey(`${input.tenantSlug}|${input.reference}`)}`,
      limit: 10,
      windowSeconds: 3600,
    });
  }
  const verdict = await enforceRateLimits(supabase, rules, { failOpen: false });
  if (!verdict.allowed) {
    return rateLimitedResponse(
      verdict.retryAfterSeconds,
      chatbotCorsHeaders,
      'Zu viele Anfragen. Bitte versuche es später noch einmal.',
    );
  }
  return null;
}
