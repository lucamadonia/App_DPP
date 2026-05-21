/**
 * Supabase Edge Function: stripe-webhook
 *
 * Processes Stripe webhook events to sync billing state.
 *
 * Events handled:
 *   - checkout.session.completed              → also fires subscription.confirmed mail
 *   - customer.subscription.updated
 *   - customer.subscription.deleted           → also fires subscription.cancelled mail
 *   - customer.subscription.trial_will_end    → fires subscription.trial_ending mail
 *   - invoice.paid
 *   - invoice.payment_failed                  → also fires subscription.payment_failed mail
 *   - invoice.payment_action_required         → also fires subscription.payment_failed mail
 *
 * Deployment:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_WEBHOOK_SECRET
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 *   - MAIL_HUB_URL              (defaults to central receiver URL if unset)
 *   - MAIL_HUB_SECRET           (REQUIRED — same as Family-Joy MAIL_EVENT_RECEIVER_SECRET)
 *   - FAMBLISS_PLUS_PORTAL_URL  (optional, defaults to https://app.fambliss.eu)
 *
 * Mail-hub POSTs are fire-and-forget: errors are logged but never block
 * the webhook 200-OK response or roll back the DB updates.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { postToMailHub } from '../_shared/mail-hub.ts';

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
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session, event.id);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription, event.id);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription, event.id);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice, event.id, event.type);
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
  stripeEventId: string,
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

      // Fire-and-forget welcome/confirmation mail. Fetch the subscription
      // to get the next billing date + customer info from Stripe so we
      // don't have to round-trip through our DB right after upsert.
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['customer'],
        });
        const customer = subscription.customer as Stripe.Customer | null;
        const nextBilling = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;
        await postToMailHub({
          eventType: 'subscription.confirmed',
          source: 'fambliss-plus',
          sourceEventId: `subscription.confirmed:${stripeEventId}`,
          recipientEmail: customer?.email || session.customer_details?.email || '',
          language: pickLanguageFromCustomer(customer, session),
          userType: 'fambliss_plus',
          context: {
            customer_first_name: extractFirstName(customer?.name || session.customer_details?.name),
            plan_name: humanPlanName(plan),
            next_billing_date: nextBilling ? nextBilling.toISOString().slice(0, 10) : '',
            portal_url: portalUrl(),
          },
          metadata: {
            tenant_id: tenantId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer,
          },
        });
      } catch (mailErr) {
        console.warn('[stripe-webhook] subscription.confirmed mail-hub post failed:', mailErr);
      }
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
  stripeEventId: string,
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

  // Fire-and-forget cancellation mail. access_until = current_period_end
  // (Stripe keeps the subscription active until then for canceled subs).
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;
      const cancelDate = subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date();
      await postToMailHub({
        eventType: 'subscription.cancelled',
        source: 'fambliss-plus',
        sourceEventId: `subscription.cancelled:${stripeEventId}`,
        recipientEmail: (customer as Stripe.Customer).email || '',
        language: pickLanguageFromCustomer(customer as Stripe.Customer, null),
        userType: 'fambliss_plus',
        context: {
          customer_first_name: extractFirstName((customer as Stripe.Customer).name),
          cancellation_date: cancelDate.toISOString().slice(0, 10),
          access_until: periodEnd ? periodEnd.toISOString().slice(0, 10) : '',
          reactivate_url: `${portalUrl()}/account/billing`,
        },
        metadata: {
          tenant_id: tenant.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
        },
      });
    }
  } catch (mailErr) {
    console.warn('[stripe-webhook] subscription.cancelled mail-hub post failed:', mailErr);
  }
}

/**
 * Stripe fires `customer.subscription.trial_will_end` ~3 days before the
 * trial converts. Customer-facing reminder mail. Also covered by the
 * trial-ending-cron as a backup if Stripe's event is lost.
 */
async function handleTrialWillEnd(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
  stripeEventId: string,
) {
  const customerId = subscription.customer as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) return;
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;
    await postToMailHub({
      eventType: 'subscription.trial_ending',
      source: 'fambliss-plus',
      // Dedup key is anchored on the subscription id so the cron's
      // backup-path uses the SAME key and the receiver will skip the
      // duplicate. This is the whole point of source_event_id idempotency.
      sourceEventId: `trial_ending:${subscription.id}`,
      recipientEmail: (customer as Stripe.Customer).email || '',
      language: pickLanguageFromCustomer(customer as Stripe.Customer, null),
      userType: 'fambliss_plus',
      context: {
        customer_first_name: extractFirstName((customer as Stripe.Customer).name),
        trial_end_date: trialEnd ? trialEnd.toISOString().slice(0, 10) : '',
        upgrade_url: `${portalUrl()}/account/billing`,
      },
      metadata: {
        tenant_id: tenant?.id ?? null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        trigger_source: 'stripe.customer.subscription.trial_will_end',
      },
    });
  } catch (mailErr) {
    console.warn('[stripe-webhook] subscription.trial_ending mail-hub post failed:', mailErr);
  }
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
  stripeEventId: string,
  stripeEventType: string,
) {
  const customerId = invoice.customer as string;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan')
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

  // Fire-and-forget payment-failed mail. We send for BOTH payment_failed
  // (renewal attempt failed) AND payment_action_required (SCA / 3DS) since
  // both need the customer to act. The trigger_event is the same; the
  // metadata.stripe_event_type lets analytics differentiate.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      await postToMailHub({
        eventType: 'subscription.payment_failed',
        source: 'fambliss-plus',
        sourceEventId: `subscription.payment_failed:${stripeEventId}`,
        recipientEmail: (customer as Stripe.Customer).email || '',
        language: pickLanguageFromCustomer(customer as Stripe.Customer, null),
        userType: 'fambliss_plus',
        context: {
          customer_first_name: extractFirstName((customer as Stripe.Customer).name),
          plan_name: humanPlanName(tenant.plan as string | null),
          retry_url: invoice.hosted_invoice_url || `${portalUrl()}/account/billing`,
          update_payment_url: `${portalUrl()}/account/billing`,
        },
        metadata: {
          tenant_id: tenant.id,
          stripe_invoice_id: invoice.id,
          stripe_customer_id: customerId,
          stripe_event_type: stripeEventType,
        },
      });
    }
  } catch (mailErr) {
    console.warn('[stripe-webhook] subscription.payment_failed mail-hub post failed:', mailErr);
  }
}

// ============================================
// MAIL HELPERS
// ============================================

function portalUrl(): string {
  return (Deno.env.get('FAMBLISS_PLUS_PORTAL_URL') || 'https://app.fambliss.eu').replace(/\/+$/, '');
}

/** "Julia Schmidt" → "Julia"; "" / null → "" (templates handle empty gracefully). */
function extractFirstName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/** Map internal plan slug to a human-readable name for the mail. */
function humanPlanName(plan: string | null | undefined): string {
  switch ((plan || '').toLowerCase()) {
    case 'pro':        return 'Fambliss+ Pro';
    case 'enterprise': return 'Fambliss+ Enterprise';
    case 'free':       return 'Fambliss+ Free';
    default:           return plan ? `Fambliss+ ${plan}` : 'Fambliss+';
  }
}

/**
 * Pick a 'de' | 'en' for the mail. Order:
 *   1. session/customer metadata.locale (if either present)
 *   2. customer preferred_locales[0]
 *   3. fall back to 'de' (most paying customers come from DACH)
 */
function pickLanguageFromCustomer(
  customer: Stripe.Customer | null,
  session: Stripe.Checkout.Session | null,
): 'de' | 'en' {
  const fromMetadata =
    (session?.metadata?.locale as string | undefined) ||
    (customer?.metadata?.locale as string | undefined);
  if (fromMetadata) {
    const short = fromMetadata.toLowerCase().slice(0, 2);
    if (short === 'de' || short === 'en') return short;
  }
  const preferred = customer?.preferred_locales?.[0];
  if (preferred) {
    const short = preferred.toLowerCase().slice(0, 2);
    if (short === 'de' || short === 'en') return short;
  }
  return 'de';
}
