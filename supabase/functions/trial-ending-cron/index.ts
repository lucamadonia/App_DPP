/**
 * Supabase Edge Function: trial-ending-cron
 *
 * Daily-scheduled backup path for `subscription.trial_ending` mails. Stripe
 * normally fires `customer.subscription.trial_will_end` ~3 days before the
 * trial converts (the stripe-webhook handler in this repo POSTs the mail
 * for that event); but if the webhook misses (network glitch, signature
 * mismatch, function down), this cron catches up.
 *
 * Both code paths send the SAME mail-hub envelope with the SAME
 * source_event_id format (`trial_ending:<subscription_id>`) so the
 * receiver's dedup is the safety net — exactly one mail per trial end,
 * whichever path fires first wins.
 *
 * Scanning logic (run once daily):
 *   1. SELECT billing_subscriptions WHERE status = 'trialing'
 *      AND trial_end BETWEEN now() + 3 days AND now() + 4 days
 *      AND stripe_subscription_id IS NOT NULL
 *   2. For each match: resolve recipient email + first name from auth.users
 *      via tenants.id → profiles.tenant_id → auth.users.id.
 *   3. POST `subscription.trial_ending` to the mail-hub.
 *
 * Triggered by pg_cron (see 20260521_engagement_and_trial_ending_crons.sql).
 *
 * Required Supabase Edge Function Secrets:
 *   SUPABASE_URL                — auto
 *   SUPABASE_SERVICE_ROLE_KEY   — auto
 *   MAIL_HUB_URL                — central receiver URL
 *   MAIL_HUB_SECRET             — same as Family-Joy MAIL_EVENT_RECEIVER_SECRET
 *   FAMBLISS_PLUS_PORTAL_URL    — optional, defaults to https://app.fambliss.eu
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { postToMailHub } from '../_shared/mail-hub.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PORTAL_URL = (Deno.env.get('FAMBLISS_PLUS_PORTAL_URL') || 'https://app.fambliss.eu').replace(/\/+$/, '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // Service-role JWT guard. pg_cron passes the service-role JWT in the
  // Authorization header (sourced from vault). Reject anyone else.
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'missing_authorization' }, 401);
  const token = authHeader.replace('Bearer ', '');
  if (!isServiceRoleJWT(token)) {
    return json({ error: 'forbidden_service_role_required' }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    return json(await fireTrialEnding(supabase));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[trial-ending-cron] failure:', msg);
    return json({ error: msg }, 500);
  }
});

interface TrialEndingResult {
  success: boolean;
  windowStart: string;
  windowEnd: string;
  scanned: number;
  fired: number;
  failed: number;
  details: Array<{
    subscriptionId: string;
    tenantId: string;
    outcome: 'fired' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

// deno-lint-ignore no-explicit-any
async function fireTrialEnding(supabase: any): Promise<TrialEndingResult> {
  // Window: trial_end falling 3-4 days from now (mirrors Stripe's own
  // trial_will_end ~3-day advance). One run/day is enough — receiver
  // dedups via source_event_id so re-firing the same row is harmless.
  const windowStart = new Date();
  windowStart.setUTCDate(windowStart.getUTCDate() + 3);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  windowEnd.setUTCHours(23, 59, 59, 999);

  const result: TrialEndingResult = {
    success: true,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    scanned: 0,
    fired: 0,
    failed: 0,
    details: [],
  };

  const { data: subs, error: subErr } = await supabase
    .from('billing_subscriptions')
    .select('tenant_id, stripe_subscription_id, stripe_customer_id, trial_end, plan, status')
    .eq('status', 'trialing')
    .gte('trial_end', windowStart.toISOString())
    .lte('trial_end', windowEnd.toISOString())
    .not('stripe_subscription_id', 'is', null);

  if (subErr) throw new Error(`billing_subscriptions query failed: ${subErr.message}`);

  for (const sub of (subs || []) as TrialingSubscription[]) {
    result.scanned++;

    // Resolve owner contact via tenants → profiles → auth.users. We accept
    // ANY profile under the tenant; for the trial-ending mail we want the
    // primary contact — for now the first one with a confirmed email.
    const owner = await resolveTenantOwner(supabase, sub.tenant_id);
    if (!owner) {
      result.failed++;
      result.details.push({
        subscriptionId: sub.stripe_subscription_id || '',
        tenantId: sub.tenant_id,
        outcome: 'skipped',
        reason: 'no_owner_email',
      });
      continue;
    }

    const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
    const ok = await postToMailHub({
      eventType: 'subscription.trial_ending',
      source: 'fambliss-plus',
      // SAME key the stripe-webhook trial_will_end branch uses → exactly
      // one mail per trial-end, even if both paths fire.
      sourceEventId: `trial_ending:${sub.stripe_subscription_id}`,
      recipientEmail: owner.email,
      language: owner.language,
      userType: 'fambliss_plus',
      context: {
        customer_first_name: owner.firstName,
        trial_end_date: trialEnd ? trialEnd.toISOString().slice(0, 10) : '',
        upgrade_url: `${PORTAL_URL}/account/billing`,
      },
      metadata: {
        tenant_id: sub.tenant_id,
        stripe_subscription_id: sub.stripe_subscription_id,
        stripe_customer_id: sub.stripe_customer_id,
        trigger_source: 'trial-ending-cron',
      },
    });

    if (ok.ok) {
      result.fired++;
      result.details.push({
        subscriptionId: sub.stripe_subscription_id || '',
        tenantId: sub.tenant_id,
        outcome: 'fired',
      });
    } else {
      result.failed++;
      result.details.push({
        subscriptionId: sub.stripe_subscription_id || '',
        tenantId: sub.tenant_id,
        outcome: 'failed',
        reason: `mail_hub_status_${ok.status}`,
      });
    }
  }

  return result;
}

interface TrialingSubscription {
  tenant_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  trial_end: string | null;
  plan: string | null;
  status: string;
}

interface TenantOwner {
  email: string;
  firstName: string;
  language: 'de' | 'en';
}

// deno-lint-ignore no-explicit-any
async function resolveTenantOwner(supabase: any, tenantId: string): Promise<TenantOwner | null> {
  // Profiles table holds the tenant↔user link. We take any profile and
  // resolve the auth.users.email + user_metadata.first_name. Limit 1 is
  // intentional — for transactional billing mail there's one obvious
  // recipient. Multi-owner tenants get the first row's owner; refine
  // later if needed (e.g. add billing_contact_user_id on tenants).
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();
  if (!profile?.id) return null;

  // auth.users is queryable from a service-role context; admin API is the
  // canonical way to read user_metadata + email together.
  const { data: userRow, error: userErr } = await supabase.auth.admin.getUserById(profile.id);
  if (userErr || !userRow?.user?.email) return null;

  const user = userRow.user;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const firstName = String(
    meta.first_name ??
    meta.firstName ??
    String(meta.full_name ?? meta.name ?? '').split(' ')[0] ??
    '',
  );
  const localeStr = String(meta.locale ?? 'de').toLowerCase().slice(0, 2);
  const language: 'de' | 'en' = localeStr === 'en' ? 'en' : 'de';

  return { email: user.email, firstName, language };
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
