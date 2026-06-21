/**
 * Supabase Edge Function: notify-dispatch
 *
 * Server-side delivery dispatcher for rh_notifications. Invoked by the
 * AFTER INSERT trigger on rh_notifications (see migration
 * 20260602b_rh_notifications_dispatch_trigger.sql) with { notificationId }.
 *
 * Why this exists: the client (browser) cannot reliably POST to the Family-Joy
 * mail-event-receiver or the local send-email function (no CORS), so mails got
 * stuck 'pending'. This runs the send server-to-server.
 *
 * Tenant routing (mirrors src/services/supabase/rh-notification-trigger.ts):
 *   - Fambliss tenants (MAIL_HUB_TENANT_IDS allowlist) → POST to Family-Joy
 *     mail-event-receiver, HMAC-signed, with the ALREADY-RENDERED subject+html
 *     as a passthrough (Trackbliss renders its own templates).
 *   - Every other tenant → invoke the local send-email function (SMTP via
 *     tenant_smtp_config / platform secrets). Keeps SaaS isolation intact.
 *
 * Required Edge Function Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — auto
 *   MAIL_HUB_URL                              — https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver
 *   MAIL_HUB_SECRET                           — same value as Family-Joy MAIL_EVENT_RECEIVER_SECRET
 *   MAIL_HUB_TENANT_IDS (optional)            — CSV of Fambliss tenant UUIDs; default = MYFAMBLISS GmbH
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MAIL_HUB_URL = Deno.env.get('MAIL_HUB_URL') || '';
const MAIL_HUB_SECRET = Deno.env.get('MAIL_HUB_SECRET') || '';
const DEFAULT_FAMBLISS_TENANT_ID = '522f6254-f73c-4a26-b1e9-662035194bc5';
const MAIL_HUB_TENANT_IDS = (Deno.env.get('MAIL_HUB_TENANT_IDS') || DEFAULT_FAMBLISS_TENANT_ID)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function mailHubAllowsTenant(tenantId: unknown): boolean {
  if (MAIL_HUB_TENANT_IDS.length === 0) return false;
  const tid = typeof tenantId === 'string' ? tenantId.trim().toLowerCase() : '';
  return tid.length > 0 && MAIL_HUB_TENANT_IDS.includes(tid);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !isServiceRoleJWT(authHeader.replace('Bearer ', ''))) {
    return json({ error: 'Forbidden — service role required' }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const notificationId = (body as { notificationId?: string }).notificationId;
    if (!notificationId) return json({ error: 'missing notificationId' }, 400);

    const { data: row, error } = await supabase
      .from('rh_notifications')
      .select('*')
      .eq('id', notificationId)
      .maybeSingle();

    if (error) return json({ error: `load failed: ${error.message}` }, 500);
    if (!row) return json({ error: 'not_found' }, 404);
    if (row.channel !== 'email') return json({ ok: true, skipped: 'not_email' });
    if (row.status !== 'pending') return json({ ok: true, skipped: `status_${row.status}` });
    if (!row.recipient_email) {
      await markFailed(supabase, row.id, row.metadata, 'no_recipient_email');
      return json({ ok: true, skipped: 'no_recipient_email' });
    }

    const meta = (row.metadata || {}) as Record<string, unknown>;
    const useHub = mailHubAllowsTenant(row.tenant_id) && !!MAIL_HUB_URL && !!MAIL_HUB_SECRET;

    // Fambliss corporate-design override. The generic Returns-Hub email
    // templates (formal "Sehr geehrte(r)", grey card) don't match the Fambliss
    // CD used by the shipment/tracking mails. For mail-hub (Fambliss) tenants we
    // re-render these return lifecycle mails as a du-form Fambliss fragment —
    // same style as buildReturnStatusMail() in dhl-shipping — which Family-Joy
    // wraps in the brand shell (logo, card, footer). Other tenants keep their
    // own templates (they go through the local path below, untouched).
    if (useHub && row.return_id && BRANDED_RETURN_EVENTS.has(row.template)) {
      try {
        const { data: ret } = await supabase
          .from('rh_returns')
          .select('return_number, refund_amount, metadata, customer_id')
          .eq('id', row.return_id)
          .maybeSingle();
        if (ret) {
          const rmeta = (ret.metadata || {}) as Record<string, unknown>;
          let name = (typeof rmeta.customerName === 'string' ? rmeta.customerName : '').trim();
          if (!name && ret.customer_id) {
            const { data: c } = await supabase
              .from('rh_customers')
              .select('name, first_name, last_name')
              .eq('id', ret.customer_id)
              .maybeSingle();
            name = (c?.name || [c?.first_name, c?.last_name].filter(Boolean).join(' ') || '').trim();
          }
          const locale = (meta.locale as string) === 'en' ? 'en' : 'de';
          const branded = buildFamblissReturnMail(row.template, {
            returnNumber: ret.return_number,
            refundAmount: ret.refund_amount,
            name,
            locale,
          });
          if (branded) {
            row.subject = branded.subject;
            row.content = branded.html;
            // Persist so the admin notification history matches what was sent.
            await supabase
              .from('rh_notifications')
              .update({ subject: branded.subject, content: branded.html })
              .eq('id', row.id);
          }
        }
      } catch (brandErr) {
        console.warn(`[notify-dispatch] Fambliss branding override failed for ${row.id}:`, brandErr);
      }
    }

    if (useHub) {
      const ok = await postToFamilyJoy({
        eventType: row.template,
        sourceEventId: `trackbliss:rh_notif:${row.id}`,
        recipientEmail: row.recipient_email,
        language: (meta.locale as string) || 'de',
        context: {
          // Trackbliss renders its own templates → pass the rendered output
          // through; the receiver sends it as-is (no Family-Joy template needed).
          renderedSubject: row.subject || '',
          renderedHtml: row.content || '',
        },
        metadata: {
          shipment_id: row.wh_shipment_id,
          return_id: row.return_id,
          ticket_id: row.ticket_id,
          customer_id: row.customer_id,
          ...meta,
        },
      });
      if (ok) {
        await markSent(supabase, row.id);
        return json({ ok: true, via: 'family-joy' });
      }
      // Hub failed — fall back to the local pipeline so the customer still gets it.
      console.warn(`[notify-dispatch] family-joy POST failed for ${row.id}, falling back to send-email`);
    }

    // Local path (non-Fambliss tenant, or hub fallback): the send-email function
    // does SMTP (tenant_smtp_config / platform) AND updates the row status.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ record: row }),
    });
    const ok = res.ok;
    return json({ ok, via: useHub ? 'send-email(fallback)' : 'send-email', status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function markSent(supabase: any, id: string) {
  await supabase.from('rh_notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
}
// deno-lint-ignore no-explicit-any
async function markFailed(supabase: any, id: string, meta: unknown, reason: string) {
  await supabase.from('rh_notifications')
    .update({ status: 'failed', metadata: { ...(meta as Record<string, unknown> || {}), error: reason } })
    .eq('id', id);
}

interface FamilyJoyPayload {
  eventType: string;
  sourceEventId: string;
  recipientEmail: string;
  language: string;
  context: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

async function postToFamilyJoy(input: FamilyJoyPayload): Promise<boolean> {
  const body = JSON.stringify({
    eventType: input.eventType,
    source: 'trackbliss',
    sourceEventId: input.sourceEventId,
    recipientEmail: input.recipientEmail,
    language: input.language,
    userType: 'customer',
    context: input.context,
    metadata: input.metadata,
  });
  try {
    const signature = await hmacHex(MAIL_HUB_SECRET, body);
    const res = await fetch(MAIL_HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hook-Signature': signature },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[notify-dispatch] family-joy ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.ok;
  } catch (err) {
    console.error('[notify-dispatch] family-joy fetch failed:', err);
    return false;
  }
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isServiceRoleJWT(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const claim = JSON.parse(atob(padded));
    return claim.role === 'service_role';
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/* -------------------------------------------------------------------------- */
/*  Fambliss corporate-design return mails                                     */
/* -------------------------------------------------------------------------- */

/** Return lifecycle events we re-render in the Fambliss CD for mail-hub tenants. */
const BRANDED_RETURN_EVENTS = new Set([
  'return_confirmed',
  'return_approved',
  'return_label_ready',
  'refund_completed',
]);

const RETURN_TRACKING_BASE = 'https://dpp-app.fambliss.eu';

/**
 * Build a Fambliss-branded return lifecycle mail: a du-form inner HTML fragment
 * in the Fambliss palette (#2d3a28 / #6b6e64) with a pill CTA — NO sign-off, as
 * the Family-Joy brand shell adds the logo + signature footer. Mirrors
 * buildReturnStatusMail() in supabase/functions/dhl-shipping so the whole return
 * journey (label → shipped → delivered → refund) looks consistent. Returns null
 * for events we don't brand, so the caller keeps the original rendered template.
 */
function buildFamblissReturnMail(
  eventType: string,
  d: { returnNumber: string; refundAmount: unknown; name: string; locale: string },
): { subject: string; html: string } | null {
  const de = d.locale !== 'en';
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rn = `<strong>${esc(d.returnNumber)}</strong>`;
  const greetName = d.name ? (de ? `Hallo ${esc(d.name)},` : `Hi ${esc(d.name)},`) : (de ? 'Hallo,' : 'Hi,');
  const trackingUrl = `${RETURN_TRACKING_BASE}/returns/track/${encodeURIComponent(d.returnNumber)}`;

  let subject = '';
  let body = '';
  let cta: { label: string; url: string } | null = null;

  if (eventType === 'return_confirmed') {
    subject = de ? 'Wir haben deine Retoure erhalten' : 'We have received your return';
    body = de
      ? `wir haben deine Retoure-Anmeldung ${rn} erhalten und prüfen sie gerade. Wir melden uns mit den nächsten Schritten bei dir.`
      : `we have received your return request ${rn} and are reviewing it. We'll get back to you with the next steps.`;
    cta = { label: de ? 'Retoure verfolgen' : 'Track return', url: trackingUrl };
  } else if (eventType === 'return_approved') {
    subject = de ? 'Deine Retoure wurde genehmigt' : 'Your return has been approved';
    body = de
      ? `gute Nachrichten – deine Retoure ${rn} wurde genehmigt. Dein Versandlabel ist gleich für dich bereit.`
      : `good news – your return ${rn} has been approved. Your shipping label will be ready for you shortly.`;
    cta = { label: de ? 'Retoure verfolgen' : 'Track return', url: trackingUrl };
  } else if (eventType === 'return_label_ready') {
    subject = de ? 'Dein Retouren-Label ist bereit' : 'Your return label is ready';
    body = de
      ? `dein Versandlabel für die Retoure ${rn} ist bereit. Du kannst dein Paket jetzt verschicken – alle Infos findest du über den Button unten.`
      : `your shipping label for return ${rn} is ready. You can send your parcel now – find everything you need via the button below.`;
    cta = { label: de ? 'Label ansehen' : 'View label', url: trackingUrl };
  } else if (eventType === 'refund_completed') {
    subject = de ? 'Deine Erstattung ist auf dem Weg' : 'Your refund is on its way';
    const amt = formatAmount(d.refundAmount, de);
    const amtStr = amt ? (de ? ` über <strong>${amt}</strong>` : ` of <strong>${amt}</strong>`) : '';
    body = de
      ? `deine Erstattung für die Retoure ${rn}${amtStr} wurde veranlasst. Der Betrag wird deinem ursprünglichen Zahlungsmittel gutgeschrieben und erscheint in der Regel innerhalb von 5–10 Werktagen.`
      : `your refund for return ${rn}${amtStr} has been initiated. The amount will be credited to your original payment method and usually appears within 5–10 business days.`;
    cta = { label: de ? 'Retoure ansehen' : 'View return', url: trackingUrl };
  } else {
    return null;
  }

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px"><tr><td bgcolor="#2d3a28" style="border-radius:9999px">`
      + `<a href="${esc(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 40px;color:#f5f4ef;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase">${esc(cta.label)}</a>`
      + `</td></tr></table>`
    : '';

  const html =
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2d3a28">${greetName}</p>`
    + `<div style="font-size:16px;line-height:1.6;color:#6b6e64">${body}</div>`
    + ctaHtml;

  return { subject, html };
}

/** Format a refund amount for the body. Empty string when missing/zero. */
function formatAmount(raw: unknown, de: boolean): string {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!isFinite(n) || n <= 0) return '';
  return de
    ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    : '€' + n.toFixed(2);
}
