/**
 * Supabase Edge Function: create-checkout-session
 *
 * Creates a Stripe Checkout session for plan upgrades,
 * module activations, or credit pack purchases.
 *
 * Deployment:
 *   supabase functions deploy create-checkout-session
 *
 * Required Supabase Secrets:
 *   - STRIPE_SECRET_KEY
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

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
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: 'No tenant found' }, 400);
    }

    const tenantId = profile.tenant_id;

    // Get or create Stripe customer
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, stripe_customer_id')
      .eq('id', tenantId)
      .single();

    let stripeCustomerId = tenant?.stripe_customer_id;

    if (!stripeCustomerId || stripeCustomerId.startsWith('pending_')) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant?.name || undefined,
        metadata: {
          tenant_id: tenantId,
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save to tenants table
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', tenantId);

      // Update billing_subscriptions
      await supabase
        .from('billing_subscriptions')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('tenant_id', tenantId);
    }

    // Parse request body
    const { priceId, mode, successUrl, cancelUrl, metadata } = await req.json();

    if (!priceId || !mode || !successUrl || !cancelUrl) {
      return jsonResponse({ error: 'Missing required fields: priceId, mode, successUrl, cancelUrl' }, 400);
    }

    // Create Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: mode as 'subscription' | 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        tenant_id: tenantId,
        user_id: user.id,
        ...metadata,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
