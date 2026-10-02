/**
 * Supabase Edge Function: create-checkout-session
 *
 * Creates a Stripe Checkout session for plan upgrades,
 * module activations, or credit pack purchases.
 *
 * Supports locale parameter for DE/EN checkout UI.
 *
 * Security (go-live hardening, SEC-05/SRE-05):
 *   - priceId must be in the server-side allowlist (_shared/stripe-catalog.ts);
 *     the checkout mode is derived from it, the client's `mode` must match.
 *   - Session metadata is built ONLY on the server (tenant, user, entitlement
 *     descriptor). Client-supplied `metadata` is ignored.
 *   - successUrl / cancelUrl must point at an allowed app origin
 *     (defaults + APP_ALLOWED_ORIGINS secret, CSV).
 *   - Only tenant admins (profiles.role = 'admin') may start a checkout (EF-06).
 *
 * Deployment:
 *   supabase functions deploy create-checkout-session
 *
 * Required Supabase Secrets:
 *   - STRIPE_SECRET_KEY
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { isAllowedRedirectUrl, resolvePrice, type CatalogEntry } from '../_shared/stripe-catalog.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Get tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: 'No tenant found' }, 400);
    }

    // EF-06: billing changes (subscribe, cancel, payment methods) are
    // tenant-admin only, like manage-vercel-domain and invite-user.
    if (profile.role !== 'admin') {
      return jsonResponse({ error: 'Only tenant admins can manage billing' }, 403);
    }

    const tenantId = profile.tenant_id;

    // Parse + validate request body BEFORE creating any Stripe objects.
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    const { priceId, mode, successUrl, cancelUrl, locale } = body as {
      priceId?: unknown; mode?: unknown; successUrl?: unknown; cancelUrl?: unknown; locale?: unknown;
    };

    if (typeof priceId !== 'string' || !successUrl || !cancelUrl) {
      return jsonResponse({ error: 'Missing required fields: priceId, successUrl, cancelUrl' }, 400);
    }

    const entry = resolvePrice(priceId);
    if (!entry) {
      return jsonResponse({ error: 'Unknown or unavailable price' }, 400);
    }
    if (mode !== undefined && mode !== entry.mode) {
      return jsonResponse({ error: 'Checkout mode does not match the selected price' }, 400);
    }
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return jsonResponse({ error: 'Redirect URL not allowed' }, 400);
    }

    // Get or create Stripe customer
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, stripe_customer_id')
      .eq('id', tenantId)
      .single();

    let stripeCustomerId = tenant?.stripe_customer_id;

    if (!stripeCustomerId || stripeCustomerId.startsWith('pending_')) {
      const linked = await linkNewStripeCustomer(supabase, tenantId, user, tenant?.name);
      if (!linked) {
        return jsonResponse({ error: 'Could not prepare billing account' }, 500);
      }
      stripeCustomerId = linked;
    }

    // Map locale to Stripe locale ('de' or 'en')
    const stripeLocale = locale === 'de' ? 'de' : 'en';

    // Server-built metadata — informational/audit only. The webhook derives
    // entitlements from the purchased price IDs and the tenant from the
    // Stripe customer, never from this metadata.
    const metadata = buildServerMetadata(entry, priceId, tenantId, user.id, stripeLocale);

    // Create Checkout Session
    // Note: automatic_tax and tax_id_collection removed — they require
    // Stripe Tax to be enabled in the Stripe Dashboard (Settings > Tax).
    // Re-add once Stripe Tax is configured.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      client_reference_id: tenantId,
      mode: entry.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl as string,
      cancel_url: cancelUrl as string,
      locale: stripeLocale,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata,
    };

    if (entry.mode === 'subscription') {
      sessionParams.subscription_data = { metadata };
    } else {
      sessionParams.payment_intent_data = { metadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return jsonResponse({ error: 'Checkout could not be started' }, 500);
  }
});

/**
 * Create a Stripe customer and link it to the tenant — race-safe.
 *
 * Two concurrent checkouts (double click, two tabs) may both create a
 * customer. Only the first conditional update (stripe_customer_id still NULL
 * or a 'pending_' placeholder) wins; the loser re-reads the tenant, uses the
 * stored customer and deletes its own orphan so a payment can never land on
 * a customer the webhook cannot map to the tenant.
 * Returns the customer id to use, or null on failure.
 */
async function linkNewStripeCustomer(
  supabase: SupabaseClient,
  tenantId: string,
  user: { id: string; email?: string },
  tenantName: string | null | undefined,
): Promise<string | null> {
  const customer = await stripe.customers.create({
    email: user.email,
    name: tenantName || undefined,
    metadata: { tenant_id: tenantId, user_id: user.id },
  });

  // Service role — the tenants guard trigger blocks every other caller from
  // changing stripe_customer_id.
  const { data: updated, error: saveErr } = await supabase
    .from('tenants')
    .update({ stripe_customer_id: customer.id })
    .eq('id', tenantId)
    .or('stripe_customer_id.is.null,stripe_customer_id.like.pending_%')
    .select('id');
  if (saveErr) {
    console.error('Failed to persist stripe_customer_id:', saveErr);
    await deleteOrphanCustomer(customer.id);
    return null;
  }

  if (updated && updated.length > 0) {
    await supabase
      .from('billing_subscriptions')
      .update({ stripe_customer_id: customer.id })
      .eq('tenant_id', tenantId);
    return customer.id;
  }

  // Lost the race: another request linked a customer in the meantime.
  await deleteOrphanCustomer(customer.id);
  const { data: current } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single();
  const stored = current?.stripe_customer_id as string | null | undefined;
  if (!stored || stored.startsWith('pending_')) return null;
  return stored;
}

async function deleteOrphanCustomer(customerId: string) {
  try {
    await stripe.customers.del(customerId);
  } catch (err) {
    console.warn('Could not delete orphan Stripe customer', customerId, (err as Error).message);
  }
}

function buildServerMetadata(
  entry: CatalogEntry,
  priceId: string,
  tenantId: string,
  userId: string,
  locale: 'de' | 'en',
): Record<string, string> {
  const base: Record<string, string> = {
    tenant_id: tenantId,
    user_id: userId,
    price_id: priceId,
    kind: entry.kind,
    locale,
  };
  if (entry.kind === 'plan') base.plan = entry.plan;
  if (entry.kind === 'module') base.module = entry.module;
  if (entry.kind === 'credits') {
    base.credit_pack = entry.pack;
    base.credits = String(entry.credits);
  }
  return base;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
