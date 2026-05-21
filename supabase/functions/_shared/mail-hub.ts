/**
 * Shared helper: HMAC-signed POST to the central mail-hub
 * (Family-Joy's `mail-event-receiver` Edge Function).
 *
 * The mail-hub is the single ingress point for every customer-facing mail
 * Fambliss sends. All callers (Trackbliss/App_DPP, Shopify webhooks,
 * Family-Joy itself) POST here with a canonical envelope; the receiver
 * dedups, resolves the message_templates row, renders, sends via SMTP,
 * and writes to email_send_log + mail_events.
 *
 * Authentication: HMAC-SHA256 hex over the raw request body, sent in the
 * `X-Hook-Signature` header. The receiver also accepts an optional
 * "sha256=" prefix on the header value. The shared secret is the same as
 * the receiver's MAIL_EVENT_RECEIVER_SECRET.
 *
 * Required env vars (set via `supabase secrets set` for every Edge
 * Function that imports this helper):
 *   MAIL_HUB_URL     — defaults to the production receiver URL if unset
 *   MAIL_HUB_SECRET  — REQUIRED, throws on missing
 *
 * Usage:
 *   import { postToMailHub } from '../_shared/mail-hub.ts';
 *   await postToMailHub({
 *     eventType: 'subscription.confirmed',
 *     source: 'fambliss-plus',
 *     sourceEventId: stripeEvent.id,
 *     recipientEmail: 'customer@example.com',
 *     language: 'de',
 *     userType: 'fambliss_plus',
 *     context: { customer_first_name: 'Julia', ... },
 *   });
 */

const DEFAULT_MAIL_HUB_URL =
  'https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver';

export interface PostToMailHubArgs {
  /** Exact `trigger_event` string registered in message_templates. */
  eventType: string;
  /** Caller identity. For App_DPP this is always 'fambliss-plus'. */
  source: string;
  /**
   * Stable deduplication key. The receiver indexes mail_events on
   * source_event_id; passing the same value twice = idempotent skip.
   * Example: `subscription.confirmed:${stripeEvent.id}`
   */
  sourceEventId: string;
  recipientEmail: string;
  language: 'de' | 'en';
  /** Recipient classification for log + analytics. */
  userType: 'fambliss_plus';
  /** Template variables (substituted as {{var}} in the rendered HTML). */
  context: Record<string, unknown>;
  /** Optional structured metadata stored on email_send_log.meta. */
  metadata?: Record<string, unknown>;
}

export interface PostToMailHubResult {
  ok: boolean;
  status: number;
  body?: string;
}

/**
 * Fire-and-forget POST to the central mail-hub. NEVER throws on network
 * or non-2xx response — callers (Stripe webhooks especially) must remain
 * resilient and the webhook 200-OK must not depend on mail delivery.
 *
 * On missing MAIL_HUB_SECRET, logs an error and returns {ok:false}
 * without making a network call — same fire-and-forget contract.
 */
export async function postToMailHub(args: PostToMailHubArgs): Promise<PostToMailHubResult> {
  const url = Deno.env.get('MAIL_HUB_URL') || DEFAULT_MAIL_HUB_URL;
  const secret = Deno.env.get('MAIL_HUB_SECRET') || '';

  if (!url) {
    console.warn('[mail-hub] MAIL_HUB_URL not set, using default:', DEFAULT_MAIL_HUB_URL);
  }
  if (!secret) {
    console.error('[mail-hub] MAIL_HUB_SECRET missing — refusing to POST');
    return { ok: false, status: 0, body: 'MAIL_HUB_SECRET missing' };
  }

  const body = JSON.stringify({
    eventType: args.eventType,
    source: args.source,
    sourceEventId: args.sourceEventId,
    recipientEmail: args.recipientEmail,
    language: args.language,
    userType: args.userType,
    context: args.context,
    metadata: args.metadata,
  });

  try {
    const signature = await hmacSha256Hex(secret, body);
    const res = await fetch(url, {
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
        `[mail-hub] non-2xx for eventType=${args.eventType} sourceEventId=${args.sourceEventId} status=${res.status}: ${text.slice(0, 300)}`,
      );
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail-hub] fetch failed for eventType=${args.eventType}: ${msg}`);
    return { ok: false, status: 0, body: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────
// logToCentralLog — fire-and-forget INSERT into Family-Joy email_send_log
// for satellite paths that send mail via local SMTP (auth-email-hook,
// send-email fallback). This is NOT a send call — it ONLY logs.
//
// Target Edge Function: Family-Joy `mail-log-ingest`. Same HMAC secret
// as mail-event-receiver. URL derived from MAIL_HUB_URL by swapping the
// path: `.../mail-event-receiver` → `.../mail-log-ingest`. Override with
// MAIL_LOG_INGEST_URL if you need a different endpoint.
// ─────────────────────────────────────────────────────────────────────

const DEFAULT_MAIL_LOG_INGEST_URL =
  'https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-log-ingest';

export interface LogToCentralLogArgs {
  /** trigger_event anchoring the row to a flow. e.g. 'auth.signup', 'auth.recovery', 'rh.return_confirmed' */
  triggerEvent: string;
  recipientEmail: string;
  status: 'sent' | 'failed' | 'skipped';
  source: string;                    // 'fambliss-plus' / 'trackbliss' / etc
  sourceEventId?: string;             // optional stable dedupe key
  recipientType?: string;             // 'fambliss_plus' / 'expert_portal' / etc
  language?: string;                  // 'de' / 'en' / 'el' / ...
  region?: 'dach' | 'intl';
  userType?: string;                  // mirrors recipientType for filter parity
  subject?: string;
  fromAddress?: string;
  replyTo?: string;
  htmlBody?: string;
  previewText?: string;
  errorMessage?: string | null;
  templateId?: string | null;
  meta?: Record<string, unknown>;
}

export async function logToCentralLog(args: LogToCentralLogArgs): Promise<{ ok: boolean; status: number }> {
  const url =
    Deno.env.get('MAIL_LOG_INGEST_URL') ||
    (Deno.env.get('MAIL_HUB_URL') || '').replace(/\/mail-event-receiver\b.*$/, '/mail-log-ingest') ||
    DEFAULT_MAIL_LOG_INGEST_URL;
  const secret = Deno.env.get('MAIL_HUB_SECRET') || '';

  if (!secret) {
    console.error('[mail-log-ingest] MAIL_HUB_SECRET missing — skipping log');
    return { ok: false, status: 0 };
  }

  const body = JSON.stringify({
    trigger_event: args.triggerEvent,
    recipient_email: args.recipientEmail,
    status: args.status,
    source: args.source,
    source_event_id: args.sourceEventId,
    recipient_type: args.recipientType,
    language: args.language,
    region: args.region,
    user_type: args.userType ?? args.recipientType,
    subject: args.subject,
    from_address: args.fromAddress,
    reply_to: args.replyTo,
    html_body: args.htmlBody,
    preview_text: args.previewText,
    error_message: args.errorMessage,
    template_id: args.templateId,
    meta: args.meta ?? {},
  });

  try {
    const signature = await hmacSha256Hex(secret, body);
    const res = await fetch(url, {
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
        `[mail-log-ingest] non-2xx status=${res.status} trigger=${args.triggerEvent}: ${text.slice(0, 200)}`,
      );
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail-log-ingest] fetch failed trigger=${args.triggerEvent}: ${msg}`);
    return { ok: false, status: 0 };
  }
}

/** HMAC-SHA256(hex) over the raw body. The receiver uses constant-time
 *  compare on the same secret and accepts an optional "sha256=" prefix
 *  (we send the bare hex form). */
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
