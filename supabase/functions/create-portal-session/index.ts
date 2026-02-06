/**
 * Supabase Edge Function: create-portal-session
 *
 * Creates a Stripe Customer Portal session for managing
 * existing subscriptions, payment methods, and invoices.
 *
 * Deployment:
 *   supabase functions deploy create-portal-session
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

    // Get tenant's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: 'No tenant found' }, 400);
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', profile.tenant_id)
      .single();

    if (!tenant?.stripe_customer_id || tenant.stripe_customer_id.startsWith('pending_')) {
      return jsonResponse({ error: 'No Stripe customer found. Please subscribe first.' }, 400);
    }

    const { returnUrl } = await req.json();

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: returnUrl || req.headers.get('origin') || '',
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-portal-session error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
