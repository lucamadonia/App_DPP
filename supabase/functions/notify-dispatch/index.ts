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
