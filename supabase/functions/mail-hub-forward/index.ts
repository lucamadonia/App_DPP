/**
 * Supabase Edge Function: mail-hub-forward
 *
 * Server-side forwarder to the Family-Joy mail-event-receiver.
 *
 * Why this exists: the browser client previously computed the HMAC-SHA256
 * signature itself using VITE_MAIL_HUB_SECRET — which shipped the shared
 * secret inside the public JS bundle, letting anyone forge validly-signed
 * mail events. The client now POSTs the unsigned event payload here; this
 * function reads the secret from Deno.env, signs the raw body and forwards
 * it to Family-Joy with the X-Hook-Signature header.
 *
 * Deployment:
 *   supabase functions deploy mail-hub-forward
 *   (Default gateway JWT verification is fine: both authenticated session
 *    tokens and the anon key — used by the public portal flows — pass.)
 *
 * Required Supabase Secrets:
 *   - MAIL_HUB_SECRET            HMAC key, identical to Family-Joy's
 *                                MAIL_EVENT_RECEIVER_SECRET.
 *                                (MAIL_EVENT_RECEIVER_SECRET is accepted
 *                                as an alias if MAIL_HUB_SECRET is unset.)
 *   - MAIL_HUB_URL               optional — defaults to the production
 *                                mail-event-receiver URL.
 */

const DEFAULT_MAIL_HUB_URL =
  'https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver';

const MAIL_HUB_URL = Deno.env.get('MAIL_HUB_URL') || DEFAULT_MAIL_HUB_URL;
const MAIL_HUB_SECRET =
  Deno.env.get('MAIL_HUB_SECRET') ||
  Deno.env.get('MAIL_EVENT_RECEIVER_SECRET') ||
  '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForwardRequestBody {
  eventType?: unknown;
  source?: unknown;
  sourceEventId?: unknown;
  recipientEmail?: unknown;
  language?: unknown;
  region?: unknown;
  userType?: unknown;
  context?: unknown;
  metadata?: unknown;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** HMAC-SHA256(hex) over the raw body. Family-Joy mail-event-receiver
 *  uses constant-time compare on the same secret. */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    if (!MAIL_HUB_SECRET) {
      console.error('[mail-hub-forward] MAIL_HUB_SECRET not configured — refusing to forward');
      return jsonResponse({ ok: false, error: 'Mail hub secret not configured' }, 500);
    }

    let payload: ForwardRequestBody;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
    }

    // ── Basic structural validation ────────────────────────────────────
    const eventType = typeof payload.eventType === 'string' ? payload.eventType.trim() : '';
    if (!eventType) {
      return jsonResponse({ ok: false, error: 'eventType is required' }, 400);
    }

    const recipientEmail =
      typeof payload.recipientEmail === 'string' ? payload.recipientEmail.trim() : '';
    if (!recipientEmail || !EMAIL_RE.test(recipientEmail) || recipientEmail.length > 320) {
      return jsonResponse({ ok: false, error: 'recipientEmail is missing or invalid' }, 400);
    }

    const language = payload.language === 'en' ? 'en' : 'de';
    const region = payload.region === 'intl' ? 'intl' : 'dach';
    const userType = typeof payload.userType === 'string' && payload.userType
      ? payload.userType
      : 'customer';
    const source = typeof payload.source === 'string' && payload.source
      ? payload.source
      : 'trackbliss';
    const sourceEventId =
      typeof payload.sourceEventId === 'string' ? payload.sourceEventId : undefined;
    const context =
      payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context)
        ? (payload.context as Record<string, unknown>)
        : {};
    const metadata =
      payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : undefined;

    // ── Sign + forward to Family-Joy ───────────────────────────────────
    const body = JSON.stringify({
      eventType,
      source,
      sourceEventId,
      recipientEmail,
      language,
      region,
      userType,
      context,
      metadata,
    });

    const signature = await hmacSha256Hex(MAIL_HUB_SECRET, body);

    const res = await fetch(MAIL_HUB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hook-Signature': signature,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(
        `[mail-hub-forward] receiver non-2xx eventType=${eventType} status=${res.status}: ${text.slice(0, 300)}`,
      );
      // 200 with ok:false — the caller decides to fall back to the local
      // send-email pipeline; this is not an error of THIS function.
      return jsonResponse({ ok: false, status: res.status }, 200);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('[mail-hub-forward] error:', err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
});
