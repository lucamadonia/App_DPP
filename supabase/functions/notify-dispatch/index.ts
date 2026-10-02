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
 *
 * Security (go-live hardening, SEC-04/SEC-14):
 *   - Auth is an exact (constant-time) compare of the bearer token with the
 *     service-role key — not a decoded, unverified role claim.
 *   - Each row is claimed atomically (claim_rh_notification 'dispatch'), so a
 *     duplicate trigger/replay can never send twice.
 *   - Rows queued by anonymous visitors (public_enqueue_notification) carry
 *     metadata.render='server' and NO content. They are rendered here from the
 *     tenant's stored template with HTML-escaped variables, so client-authored
 *     HTML never reaches Family-Joy or SMTP.
 *   - send-email only receives { notificationId } and re-loads the row itself.
 *
 * DEPLOY PRECONDITION (SEC-14): the only production caller is the
 * rh_notifications AFTER INSERT trigger (20260602b), which sends the vault
 * secret 'service_role_jwt' as bearer token. That value must byte-equal
 * SUPABASE_SERVICE_ROLE_KEY or the optional SERVICE_ROLE_JWT secret, or every
 * mail gets 403 (visible only in net._http_response + the error log below) and
 * rows stay 'pending'. Before deploying:
 *   1. SQL editor: SELECT md5(decrypted_secret) FROM vault.decrypted_secrets
 *        WHERE name = 'service_role_jwt';
 *   2. Compare with md5 of the project's service_role key (Dashboard > API).
 *   3. If they differ: supabase secrets set SERVICE_ROLE_JWT=<vault value>.
 *   After deploy: insert one test row and confirm status leaves 'pending'.
 *
 * ROLLOUT ORDER (mandatory, docs/releases/golive-20261001-mail-rollout.md):
 *   1. migration 20261001d (claim_rh_notification, tenant_mail_tier,
 *      public_enqueue_notification) — without it every mail 500s 'claim_failed'
 *      and stays 'pending'.
 *   2. vault 'service_role_jwt' check above, then deploy THIS function and
 *      send-email together.
 *   3. then the frontend. An OLD notify-dispatch cannot render the
 *      render='server' rows the new frontend queues and would send empty mails.
 *
 * Deploy with verify_jwt = true (supabase/config.toml).
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isServiceRoleRequest } from '../_shared/service-auth.ts';
import { renderStoredTemplate, sanitizePublicText, type ServerRenderVars } from '../_shared/email-template-render.ts';

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

  if (!isServiceRoleRequest(req)) {
    // Logged loudly: the only legitimate caller is the pg_net trigger. If this
    // fires for trigger calls, the vault secret 'service_role_jwt' differs from
    // SUPABASE_SERVICE_ROLE_KEY — set the SERVICE_ROLE_JWT secret to the vault
    // value, otherwise every transactional mail stays 'pending'.
    console.error('[notify-dispatch] 403: bearer token is not the service-role key (check vault service_role_jwt vs SUPABASE_SERVICE_ROLE_KEY / SERVICE_ROLE_JWT)');
    return json({ error: 'Forbidden — service role required' }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const notificationId = (body as { notificationId?: string }).notificationId;
    if (!notificationId || typeof notificationId !== 'string') return json({ error: 'missing notificationId' }, 400);

    const { data: peek, error } = await supabase
      .from('rh_notifications')
      .select('id, channel, status')
      .eq('id', notificationId)
      .maybeSingle();

    if (error) return json({ error: 'load_failed' }, 500);
    if (!peek) return json({ error: 'not_found' }, 404);
    if (peek.channel !== 'email') return json({ ok: true, skipped: 'not_email' });
    if (peek.status !== 'pending') return json({ ok: true, skipped: `status_${peek.status}` });

    // Atomic claim: only one dispatcher run may handle a row.
    const { data: claimed, error: claimError } = await supabase
      .rpc('claim_rh_notification', { p_id: notificationId, p_stage: 'dispatch' });
    if (claimError) {
      console.error(`[notify-dispatch] claim failed for ${notificationId}:`, claimError.message);
      return json({ error: 'claim_failed' }, 500);
    }
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if (!row) return json({ ok: true, skipped: 'already_claimed' });

    if (!row.recipient_email) {
      await markFailed(supabase, row.id, row.metadata, 'no_recipient_email');
      return json({ ok: true, skipped: 'no_recipient_email' });
    }

    const meta = (row.metadata || {}) as Record<string, unknown>;
    const useHub = mailHubAllowsTenant(row.tenant_id) && !!MAIL_HUB_URL && !!MAIL_HUB_SECRET;

    // Public-portal rows: render the tenant template server-side. Never trust
    // stored content for these (there is none; anon cannot write rows).
    if (meta.render === 'server') {
      const rendered = await renderServerSide(supabase, row, meta);
      if (!rendered) {
        await markFailed(supabase, row.id, row.metadata, 'server_render_failed');
        return json({ ok: true, skipped: 'server_render_failed' });
      }
      row.subject = rendered.subject;
      row.content = rendered.html;
      await supabase
        .from('rh_notifications')
        .update({ subject: rendered.subject, content: rendered.html })
        .eq('id', row.id);
    }

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

    // Never deliver an empty mail (e.g. an unrendered render='server' row).
    if (!String(row.content || '').trim()) {
      await markFailed(supabase, row.id, row.metadata, 'empty_content');
      return json({ ok: true, skipped: 'empty_content' });
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
          // Plain-text rows (isHtml !== true, e.g. CRM "Kunde kontaktieren")
          // are escaped first so they can never inject markup into the hub mail.
          renderedSubject: row.subject || '',
          renderedHtml: meta.isHtml === true ? (row.content || '') : plainTextToHtml(row.content || ''),
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
      // Only the id: send-email re-loads and claims the row itself.
      body: JSON.stringify({ notificationId: row.id }),
    });
    const ok = res.ok;
    return json({ ok, via: useHub ? 'send-email(fallback)' : 'send-email', status: res.status });
  } catch (err) {
    console.error('[notify-dispatch] unexpected error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});

/** Escape plain text and keep line breaks (hub passthrough of plain-text rows). */
function plainTextToHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '<br>');
}

/**
 * Render a public-portal row from the tenant's stored rh_email_templates entry.
 * Variables come from metadata.vars (built server-side by
 * public_enqueue_notification) and are HTML-escaped by the renderer.
 */
async function renderServerSide(supabase: SupabaseClient, row: { id: string; tenant_id: string; template: string }, meta: Record<string, unknown>) {
  try {
    const { data: template } = await supabase
      .from('rh_email_templates')
      .select('enabled, subject_template, body_template, html_template, design_config')
      .eq('tenant_id', row.tenant_id)
      .eq('event_type', row.template)
      .maybeSingle();
    if (!template || template.enabled === false) return null;
    const locale = meta.locale === 'en' ? 'en' : 'de';
    const rawVars = (meta.vars && typeof meta.vars === 'object' ? meta.vars : {}) as Record<string, unknown>;
    const vars: ServerRenderVars = {};
    const keys = ['customerName', 'firstName', 'returnNumber', 'status', 'reason', 'reasonCategory', 'ticketNumber', 'subject', 'trackingUrl'] as const;
    // Visitor-controlled free text: strip URLs/domains and shorten again here
    // (the RPC already does this; defence in depth for older queued rows).
    const freeTextMax: Partial<Record<(typeof keys)[number], number>> = {
      customerName: 60, firstName: 60, reason: 200, reasonCategory: 60, subject: 80,
    };
    const isPublic = meta.origin === 'public';
    for (const key of keys) {
      const v = rawVars[key];
      if (typeof v !== 'string') continue;
      const max = freeTextMax[key];
      // Plain code-like values (e.g. reason keys such as 'wrong_size') cannot
      // carry a URL and must keep their underscores for the label lookup.
      const isCode = /^[a-z0-9_]{1,60}$/i.test(v);
      vars[key] = isPublic && max && !isCode ? sanitizePublicText(v, max) : v.slice(0, 500);
    }
    return renderStoredTemplate(template, vars, locale);
  } catch (err) {
    console.error(`[notify-dispatch] server render failed for ${row.id}:`, err);
    return null;
  }
}

async function markSent(supabase: SupabaseClient, id: string) {
  await supabase.from('rh_notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
}
async function markFailed(supabase: SupabaseClient, id: string, meta: unknown, reason: string) {
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
  // Bewusst KEIN region-Feld: der mail-event-receiver löst die Region seit
  // Juli 2026 selbst über shop_customers.region auf (aus dem Adressland des
  // Shopify-Mirrors — genauer als jede Ableitung aus locale oder Email-TLD).
  // Ein hier geratener Hint würde diese DB-Auflösung nur überschreiben.
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
