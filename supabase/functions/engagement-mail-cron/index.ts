/**
 * Supabase Edge Function: engagement-mail-cron
 *
 * Cron-triggered fire of post-delivery engagement mails. Supports four
 * day-offset actions:
 *
 *   action=fire_engagement_day_1  → trigger_event "engagement.day_1"
 *   action=fire_feedback_day_7    → trigger_event "feedback_request"   (legacy / v1)
 *   action=fire_engagement_day_14 → trigger_event "engagement.day_14"
 *   action=fire_engagement_day_30 → trigger_event "engagement.day_30"
 *
 * Each cron run scans wh_shipments for rows with `delivered_at` falling in
 * the UTC day N days ago, dedupes against the central mail-hub's
 * email_send_log (via source_event_id keyed on shipment.id+offset) and
 * fires one POST per matching shipment.
 *
 * Triggered by pg_cron (see migrations 20260519b_engagement_feedback_cron.sql
 * + 20260521_engagement_and_trial_ending_crons.sql).
 *
 * Required Supabase Edge Function Secrets (set via Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL                — auto (Supabase-managed)
 *   SUPABASE_SERVICE_ROLE_KEY   — auto
 *   MAIL_HUB_URL                — https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver
 *   MAIL_HUB_SECRET             — same value as Family-Joy MAIL_EVENT_RECEIVER_SECRET
 *   TRACKBLISS_PUBLIC_URL       — optional override, defaults to https://dpp-app.fambliss.eu
 *   FAMBLISS_SHOP_URL           — optional, defaults to https://shop.fambliss.de
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MAIL_HUB_URL = Deno.env.get('MAIL_HUB_URL') || '';
const MAIL_HUB_SECRET = Deno.env.get('MAIL_HUB_SECRET') || '';
const TRACKBLISS_PUBLIC_URL = (Deno.env.get('TRACKBLISS_PUBLIC_URL') || 'https://dpp-app.fambliss.eu').replace(/\/+$/, '');
const FAMBLISS_SHOP_URL = (Deno.env.get('FAMBLISS_SHOP_URL') || 'https://shop.fambliss.de').replace(/\/+$/, '');

const FEEDBACK_DELAY_DAYS = 7;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const token = authHeader.replace('Bearer ', '');
  if (!isServiceRoleJWT(token)) {
    return json({ error: 'Forbidden — service role required' }, 403);
  }

  if (!MAIL_HUB_URL || !MAIL_HUB_SECRET) {
    return json({ error: 'MAIL_HUB_URL or MAIL_HUB_SECRET secret not configured' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const peek = await req.clone().json().catch(() => ({} as Record<string, unknown>));
    const action = (peek as { action?: string }).action || 'fire_feedback_day_7';

    if (action === 'fire_feedback_day_7') {
      return json(await fireFeedbackDay7(supabase));
    }

    // Day 1 / 14 / 30 share the same scan-and-fire shape; parametrize on
    // the day offset, trigger_event string, and CTA URLs.
    if (action === 'fire_engagement_day_1') {
      return json(await fireEngagementDay(supabase, {
        delayDays: 1,
        triggerEvent: 'engagement.day_1',
        // Day 1: ask for a review.
        buildContext: (ship, firstName) => ({
          customer_first_name: firstName,
          order_number: ship.shipment_number || '',
          product_name: '',
          review_url: `${FAMBLISS_SHOP_URL}/account/orders`,
        }),
      }));
    }
    if (action === 'fire_engagement_day_14') {
      return json(await fireEngagementDay(supabase, {
        delayDays: 14,
        triggerEvent: 'engagement.day_14',
        // Day 14: tips for using / loving the product.
        buildContext: (ship, firstName) => ({
          customer_first_name: firstName,
          order_number: ship.shipment_number || '',
          product_name: '',
          tips_url: `${FAMBLISS_SHOP_URL}/blogs/news`,
        }),
      }));
    }
    if (action === 'fire_engagement_day_30') {
      return json(await fireEngagementDay(supabase, {
        delayDays: 30,
        triggerEvent: 'engagement.day_30',
        // Day 30: community + refer-a-friend.
        buildContext: (ship, firstName) => ({
          customer_first_name: firstName,
          order_number: ship.shipment_number || '',
          product_name: '',
          community_url: `${FAMBLISS_SHOP_URL}/pages/community`,
          referral_url: `${FAMBLISS_SHOP_URL}/pages/empfehlen`,
        }),
      }));
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

// ─── Action: fire feedback_request mails for shipments delivered N days ago ──

interface FireResult {
  success: boolean;
  delayDays: number;
  windowStart: string;
  windowEnd: string;
  tenantsEligible: number;
  scanned: number;
  fired: number;
  skipped: number;
  failed: number;
  details: Array<{
    shipmentId: string;
    tenantId: string;
    outcome: 'fired' | 'skipped' | 'failed';
    reason?: string;
    token?: string;
  }>;
}

// deno-lint-ignore no-explicit-any
async function fireFeedbackDay7(supabase: any): Promise<FireResult> {
  // 1. Compute the [delivered_at] window: the UTC day exactly N days ago.
  const cutoffStart = new Date();
  cutoffStart.setUTCDate(cutoffStart.getUTCDate() - FEEDBACK_DELAY_DAYS);
  cutoffStart.setUTCHours(0, 0, 0, 0);
  const cutoffEnd = new Date(cutoffStart);
  cutoffEnd.setUTCHours(23, 59, 59, 999);

  const result: FireResult = {
    success: true,
    delayDays: FEEDBACK_DELAY_DAYS,
    windowStart: cutoffStart.toISOString(),
    windowEnd: cutoffEnd.toISOString(),
    tenantsEligible: 0,
    scanned: 0,
    fired: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  // 2. Find tenants with the feedback module active. Skip silently if module
  // table is missing (legacy environments without billing tables).
  const { data: modSubs, error: modErr } = await supabase
    .from('billing_module_subscriptions')
    .select('tenant_id')
    .eq('module_id', 'feedback_starter')
    .eq('status', 'active');

  if (modErr) {
    console.warn('[engagement-cron] billing_module_subscriptions query failed:', modErr.message);
    // Fail open: continue scanning all tenants. The mail trigger will still
    // skip per-tenant if the rh_email_templates row is disabled.
  }

  const eligibleTenants = new Set<string>((modSubs || []).map((r: { tenant_id: string }) => r.tenant_id));
  result.tenantsEligible = eligibleTenants.size;

  // 3. Find candidate shipments. We do NOT filter by tenant when the module
  // table failed to load (fail-open above); the trigger gate inside the mail
  // path acts as a second backstop.
  let q = supabase
    .from('wh_shipments')
    .select('id, tenant_id, recipient_email, recipient_name, shipment_number, delivered_at')
    .eq('status', 'delivered')
    .gte('delivered_at', cutoffStart.toISOString())
    .lte('delivered_at', cutoffEnd.toISOString())
    .not('recipient_email', 'is', null);

  if (modSubs && eligibleTenants.size > 0) {
    q = q.in('tenant_id', Array.from(eligibleTenants));
  } else if (modSubs && eligibleTenants.size === 0) {
    // Module table loaded but no tenant has feedback_starter — nothing to do.
    return result;
  }

  const { data: shipments, error: shipErr } = await q;
  if (shipErr) throw new Error(`wh_shipments query failed: ${shipErr.message}`);

  for (const ship of shipments || []) {
    result.scanned++;
    const outcome = await processShipment(supabase, ship);
    result.details.push(outcome);
    if (outcome.outcome === 'fired') result.fired++;
    else if (outcome.outcome === 'skipped') result.skipped++;
    else result.failed++;
  }

  return result;
}

interface ShipmentRow {
  id: string;
  tenant_id: string;
  recipient_email: string;
  recipient_name: string | null;
  shipment_number: string | null;
  delivered_at: string;
}

// ─── Action: fire engagement.day_N mail for shipments delivered N days ago ──

interface EngagementDayConfig {
  delayDays: number;
  triggerEvent: 'engagement.day_1' | 'engagement.day_14' | 'engagement.day_30';
  /**
   * Build the template context for a given shipment. Receives the shipment
   * row + extracted first name. Output map keys must match the placeholders
   * the matching message_templates row expects (snake_case in templates).
   */
  buildContext: (ship: ShipmentRow, firstName: string) => Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
async function fireEngagementDay(
  supabase: any,
  config: EngagementDayConfig,
): Promise<FireResult> {
  // Compute the [delivered_at] window: the UTC day exactly N days ago.
  const cutoffStart = new Date();
  cutoffStart.setUTCDate(cutoffStart.getUTCDate() - config.delayDays);
  cutoffStart.setUTCHours(0, 0, 0, 0);
  const cutoffEnd = new Date(cutoffStart);
  cutoffEnd.setUTCHours(23, 59, 59, 999);

  const result: FireResult = {
    success: true,
    delayDays: config.delayDays,
    windowStart: cutoffStart.toISOString(),
    windowEnd: cutoffEnd.toISOString(),
    // Engagement day_1/14/30 fire for ALL tenants — no module gate.
    // (The original feedback path gates on feedback_starter; the broader
    //  engagement series is part of every customer journey.)
    tenantsEligible: 0,
    scanned: 0,
    fired: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  const { data: shipments, error: shipErr } = await supabase
    .from('wh_shipments')
    .select('id, tenant_id, recipient_email, recipient_name, shipment_number, delivered_at')
    .eq('status', 'delivered')
    .gte('delivered_at', cutoffStart.toISOString())
    .lte('delivered_at', cutoffEnd.toISOString())
    .not('recipient_email', 'is', null);

  if (shipErr) throw new Error(`wh_shipments query failed: ${shipErr.message}`);

  for (const ship of (shipments || []) as ShipmentRow[]) {
    result.scanned++;
    const firstName = (ship.recipient_name || '').trim().split(/\s+/)[0] || 'Kunde';
    // sourceEventId is deterministic — receiver-side dedup catches re-runs
    // even within the same UTC day if pg_cron retries or if the cron job
    // fires twice. Pattern matches the existing feedback path.
    const sourceEventId = `trackbliss:engagement_cron:${config.triggerEvent}:${ship.id}`;
    const context = config.buildContext(ship, firstName);

    const ok = await postToFamilyJoy({
      eventType: config.triggerEvent,
      sourceEventId,
      recipientEmail: ship.recipient_email,
      language: 'de',
      context,
      metadata: {
        shipment_id: ship.id,
        tenant_id: ship.tenant_id,
        trigger_source: `engagement-mail-cron/fire_engagement_day_${config.delayDays}`,
        delivered_at: ship.delivered_at,
      },
    });

    if (ok) {
      result.fired++;
      result.details.push({
        shipmentId: ship.id,
        tenantId: ship.tenant_id,
        outcome: 'fired',
      });
    } else {
      result.failed++;
      result.details.push({
        shipmentId: ship.id,
        tenantId: ship.tenant_id,
        outcome: 'failed',
        reason: 'family_joy_post_failed',
      });
    }
  }

  return result;
}

// deno-lint-ignore no-explicit-any
async function processShipment(supabase: any, ship: ShipmentRow):
  Promise<{ shipmentId: string; tenantId: string; outcome: 'fired' | 'skipped' | 'failed'; reason?: string; token?: string }> {

  // Dedup: skip if ANY feedback_request already exists for this shipment.
  const { data: existing } = await supabase
    .from('feedback_requests')
    .select('id, token')
    .eq('shipment_id', ship.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'skipped', reason: 'already_has_feedback_request', token: existing.token };
  }

  // Fetch shipment items. Note: wh_shipment_items has no variant_title column —
  // variant info lives on product_batches.shopify_product_map (matches the
  // client-side transformShipmentItem() join in wh-shipments.ts:1054).
  const { data: items, error: itemsErr } = await supabase
    .from('wh_shipment_items')
    .select('product_id, batch_id, product_batches(shopify_product_map(shopify_variant_title, is_active))')
    .eq('shipment_id', ship.id);

  if (itemsErr) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'failed', reason: `items_query_failed:${itemsErr.message}` };
  }
  if (!items?.length) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'skipped', reason: 'no_items' };
  }

  // Resolve variant_title per item via shopify_product_map (prefer active mapping)
  // and dedup by (product, batch, variant) — matches client createFeedbackRequestsForShipment.
  // deno-lint-ignore no-explicit-any
  const enriched: Array<{ product_id: string; batch_id: string | null; variant_title: string | null }> = (items as any[])
    .filter((it) => it.product_id)
    .map((it) => {
      const mappings = it.product_batches?.shopify_product_map;
      const variantTitle = Array.isArray(mappings)
        // deno-lint-ignore no-explicit-any
        ? (mappings.find((m: any) => m?.is_active && m?.shopify_variant_title)?.shopify_variant_title
        // deno-lint-ignore no-explicit-any
            || mappings.find((m: any) => m?.shopify_variant_title)?.shopify_variant_title)
        : null;
      return {
        product_id: it.product_id as string,
        batch_id: (it.batch_id as string | null) || null,
        variant_title: variantTitle || null,
      };
    });

  const seen = new Set<string>();
  const variants = enriched.filter((it) => {
    const key = `${it.product_id}::${it.batch_id || ''}::${it.variant_title || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!variants.length) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'skipped', reason: 'no_valid_variants' };
  }

  // Generate one token per variant via the existing Postgres function.
  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];
  for (const v of variants) {
    const { data: tokenData, error: tokenErr } = await supabase.rpc('generate_tracking_token');
    if (tokenErr || !tokenData) {
      return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'failed', reason: `token_gen_failed:${tokenErr?.message || 'no_data'}` };
    }
    rows.push({
      tenant_id: ship.tenant_id,
      shipment_id: ship.id,
      product_id: v.product_id,
      batch_id: v.batch_id || null,
      variant_title: v.variant_title || null,
      customer_email: ship.recipient_email,
      customer_name: ship.recipient_name || 'Kunde',
      token: tokenData,
      status: 'pending',
      sent_at: now,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from('feedback_requests')
    .insert(rows)
    .select('id, token');

  if (insErr || !inserted?.length) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'failed', reason: `insert_failed:${insErr?.message || 'no_rows'}` };
  }

  const firstToken = inserted[0].token as string;
  const firstName = (ship.recipient_name || '').trim().split(/\s+/)[0] || 'Kunde';

  const ok = await postToFamilyJoy({
    eventType: 'feedback_request',
    sourceEventId: `trackbliss:engagement_cron:${ship.id}`,
    recipientEmail: ship.recipient_email,
    language: 'de',
    context: {
      customerName: ship.recipient_name || 'Kunde',
      firstName,
      feedbackUrl: `${TRACKBLISS_PUBLIC_URL}/feedback/${firstToken}`,
      shipmentNumber: ship.shipment_number || '',
    },
    metadata: {
      shipment_id: ship.id,
      tenant_id: ship.tenant_id,
      trigger_source: 'engagement-mail-cron/fire_feedback_day_7',
    },
  });

  if (!ok) {
    return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'failed', reason: 'family_joy_post_failed', token: firstToken };
  }

  return { shipmentId: ship.id, tenantId: ship.tenant_id, outcome: 'fired', token: firstToken };
}

// ─── Family-Joy mail-event-receiver POST (HMAC-SHA256 signed) ─────────────────

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
      headers: {
        'Content-Type': 'application/json',
        'X-Hook-Signature': signature,
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[engagement-cron] family-joy ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.ok;
  } catch (err) {
    console.error('[engagement-cron] family-joy fetch failed:', err);
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
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
