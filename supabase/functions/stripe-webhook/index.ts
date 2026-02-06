/**
 * Supabase Edge Function: stripe-webhook
 *
 * Processes Stripe webhook events to sync billing state.
 *
 * Events handled:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.paid
 *   - invoice.payment_failed
 *
 * Deployment:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_WEBHOOK_SECRET
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not configured');
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET is not configured');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

Deno.serve(async (req) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify Stripe signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// EVENT HANDLERS
// ============================================

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const tenantId = session.metadata?.tenant_id;
  if (!tenantId) {
    console.error('No tenant_id in checkout session metadata');
    return;
  }

  if (session.mode === 'subscription') {
    // Plan upgrade or module activation
    const plan = session.metadata?.plan;
    const moduleId = session.metadata?.module;
    const subscriptionId = session.subscription as string;

    if (plan) {
      // Update billing_subscriptions
      await supabase
        .from('billing_subscriptions')
        .upsert({
          tenant_id: tenantId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          plan,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' });

      // Update tenants.plan
      await supabase
        .from('tenants')
        .update({ plan })
        .eq('id', tenantId);

      // Update credit allowance
      const allowanceMap: Record<string, number> = { free: 3, pro: 25, enterprise: 100 };
      await supabase
        .from('billing_credits')
        .update({
          monthly_allowance: allowanceMap[plan] || 3,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    }

    if (moduleId) {
      // Activate module
      await supabase
        .from('billing_module_subscriptions')
        .upsert({
          tenant_id: tenantId,
          module_id: moduleId,
          stripe_subscription_item_id: subscriptionId,
          status: 'active',
          activated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,module_id' });
    }
  } else if (session.mode === 'payment') {
    // One-time credit pack purchase
    const creditPack = session.metadata?.credit_pack;
    const credits = parseInt(session.metadata?.credits || '0', 10);

    if (credits > 0) {
      // Update credit balance
      const { data: current } = await supabase
        .from('billing_credits')
        .select('purchased_balance, total_purchased')
        .eq('tenant_id', tenantId)
        .single();

      await supabase
        .from('billing_credits')
        .update({
          purchased_balance: (current?.purchased_balance || 0) + credits,
          total_purchased: (current?.total_purchased || 0) + credits,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      // Log transaction
      await supabase
        .from('billing_credit_transactions')
        .insert({
          tenant_id: tenantId,
          type: 'purchase',
          amount: credits,
          balance_after: (current?.purchased_balance || 0) + credits,
          source: 'purchased',
          description: `Purchased ${creditPack} credit pack (${credits} credits)`,
          metadata: { credit_pack: creditPack, session_id: session.id },
          user_id: session.metadata?.user_id,
        });
    }
  }
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const customerId = subscription.customer as string;

  // Find tenant by Stripe customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!tenant) {
    console.error('No tenant found for Stripe customer:', customerId);
    return;
  }

  // Determine plan from subscription items metadata
  const planItem = subscription.items.data.find(
    (item) => item.price.metadata?.trackbliss_plan,
  );
  const plan = planItem?.price.metadata?.trackbliss_plan || 'free';

  // Update subscription record
  await supabase
    .from('billing_subscriptions')
    .update({
      plan,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id);

  // Sync tenants.plan
  await supabase
    .from('tenants')
    .update({ plan })
    .eq('id', tenant.id);

  // Sync module subscription items
  for (const item of subscription.items.data) {
    const moduleId = item.price.metadata?.trackbliss_module;
    if (moduleId) {
      await supabase
        .from('billing_module_subscriptions')
        .upsert({
          tenant_id: tenant.id,
          module_id: moduleId,
          stripe_subscription_item_id: item.id,
          status: 'active',
        }, { onConflict: 'tenant_id,module_id' });
    }
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const customerId = subscription.customer as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!tenant) return;

  // Downgrade to free
  await supabase
    .from('billing_subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id);

  await supabase
    .from('tenants')
    .update({ plan: 'free' })
    .eq('id', tenant.id);

  // Cancel all modules
  await supabase
    .from('billing_module_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id)
    .eq('status', 'active');

  // Reset credit allowance to free tier
  await supabase
    .from('billing_credits')
    .update({
      monthly_allowance: 3,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id);
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
) {
  const customerId = invoice.customer as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!tenant) return;

  // Store invoice
  await supabase
    .from('billing_invoices')
    .upsert({
      tenant_id: tenant.id,
      stripe_invoice_id: invoice.id,
      stripe_invoice_url: invoice.hosted_invoice_url,
      stripe_pdf_url: invoice.invoice_pdf,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
    }, { onConflict: 'stripe_invoice_id' });

  // Reset monthly credits (new billing cycle)
  if (invoice.billing_reason === 'subscription_cycle') {
    const { data: credits } = await supabase
      .from('billing_credits')
      .select('monthly_allowance')
      .eq('tenant_id', tenant.id)
      .single();

    await supabase
      .from('billing_credits')
      .update({
        monthly_used: 0,
        monthly_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenant.id);

    // Log reset
    await supabase
      .from('billing_credit_transactions')
      .insert({
        tenant_id: tenant.id,
        type: 'monthly_reset',
        amount: credits?.monthly_allowance || 0,
        balance_after: credits?.monthly_allowance || 0,
        source: 'monthly',
        description: 'Monthly credit reset on billing cycle',
      });
  }
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice,
) {
  const customerId = invoice.customer as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!tenant) return;

  // Mark subscription as past_due
  await supabase
    .from('billing_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenant.id);

  // Store/update invoice
  await supabase
    .from('billing_invoices')
    .upsert({
      tenant_id: tenant.id,
      stripe_invoice_id: invoice.id,
      stripe_invoice_url: invoice.hosted_invoice_url,
      stripe_pdf_url: invoice.invoice_pdf,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'open',
    }, { onConflict: 'stripe_invoice_id' });
}
