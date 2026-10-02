/**
 * Supabase Edge Function: stripe-webhook
 *
 * Processes Stripe webhook events to sync billing state.
 *
 * Events handled:
 *   - checkout.session.completed              → also fires subscription.confirmed mail
 *   - checkout.session.async_payment_succeeded
 *   - customer.subscription.created / updated
 *   - customer.subscription.deleted           → also fires subscription.cancelled mail
 *   - customer.subscription.trial_will_end    → fires subscription.trial_ending mail
 *   - invoice.paid
 *   - invoice.payment_failed                  → also fires subscription.payment_failed mail
 *   - invoice.payment_action_required         → also fires subscription.payment_failed mail
 *
 * Security model (go-live hardening QA-1, SEC-05/SRE-05, SRE-11):
 *   - Signature verified with constructEventAsync + SubtleCrypto (verify.ts).
 *   - Tenant is resolved from tenants.stripe_customer_id (written only by
 *     create-checkout-session with the service role; a DB trigger blocks
 *     every other writer). Session metadata is never trusted.
 *   - Plans, modules and credit amounts are derived from the purchased
 *     price IDs via the server-side allowlist (_shared/stripe-catalog.ts).
 *   - Idempotency: every event id is claimed in `stripe_events`; credit
 *     grants are additionally idempotent per checkout session
 *     (grant_purchased_credits RPC).
 *
 * Deployment (MUST ship together with migration 20261001e and the new
 * create-checkout-session + openrouter-proxy):
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
 *   - STRIPE_PRICE_CATALOG_JSON (optional, extra allowlisted prices)
 *
 * Mail-hub POSTs are fire-and-forget: errors are logged but never block
 * the webhook 200-OK response or roll back the DB updates.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { postToMailHub } from '../_shared/mail-hub.ts';
import { verifyStripeEvent } from './verify.ts';
import { subscriptionGrantsAccess, sumPurchasedCredits } from './entitlements.ts';
import {
  customerIdOf,
  type Db,
  invoiceSubscriptionId,
  planSubscriptionIdOf,
  resolveTenant,
  refetch,
  resolveTenantId,
  setMonthlyAllowance,
  subscriptionPeriod,
  syncSubscription,
  upsertInvoice,
} from './billing-sync.ts';
import { extractFirstName, humanPlanName, pickLanguageFromCustomer, portalUrl } from './mail-helpers.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!STRIPE_SECRET_KEY) console.error('STRIPE_SECRET_KEY is not configured');
if (!STRIPE_WEBHOOK_SECRET) console.error('STRIPE_WEBHOOK_SECRET is not configured');

// Pin the API version explicitly: objects re-retrieved through the SDK are
// then always rendered in the shape these handlers were written for, no
// matter which API version the webhook endpoint itself uses.
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await verifyStripeEvent(stripe, body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Idempotency: claim the event id before doing any work.
  const { data: claim, error: claimErr } = await supabase.rpc('claim_stripe_event', {
    p_event_id: event.id,
    p_type: event.type,
  });
  if (claimErr) {
    console.error('claim_stripe_event failed:', claimErr);
    return json({ error: 'Could not record event' }, 500);
  }
  if (claim === 'duplicate') {
    return json({ received: true, duplicate: true });
  }
  if (claim === 'in_flight') {
    // Another delivery is processing this event; let Stripe retry later.
    return json({ error: 'Event is being processed' }, 409);
  }

  console.log(`Processing Stripe event: ${event.type} (${event.id})`);

  try {
    await dispatchEvent(supabase, event);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Webhook handler error:', msg);
    await supabase.rpc('finish_stripe_event', { p_event_id: event.id, p_success: false, p_error: msg });
    return json({ error: 'Internal server error' }, 500);
  }

  const { error: finishErr } = await supabase.rpc('finish_stripe_event', {
    p_event_id: event.id,
    p_success: true,
  });
  if (finishErr) console.error('finish_stripe_event failed:', finishErr);

  return json({ received: true });
});

async function dispatchEvent(supabase: Db, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session, event.id);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(
        supabase,
        await freshSubscription(event.data.object as Stripe.Subscription),
        event.type === 'customer.subscription.created',
      );
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(
        supabase,
        await freshSubscription(event.data.object as Stripe.Subscription),
        event.id,
      );
      break;
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(supabase, await freshInvoice(event.data.object as Stripe.Invoice));
      break;
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required':
      await handleInvoicePaymentFailed(
        supabase,
        await freshInvoice(event.data.object as Stripe.Invoice),
        event.id,
        event.type,
      );
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/** Subscription as rendered by the pinned API version (see refetch). */
function freshSubscription(payload: Stripe.Subscription): Promise<Stripe.Subscription> {
  return refetch(payload, () => stripe.subscriptions.retrieve(payload.id));
}

/** Invoice as rendered by the pinned API version (see refetch). */
function freshInvoice(payload: Stripe.Invoice): Promise<Stripe.Invoice> {
  if (!payload.id) return Promise.resolve(payload);
  return refetch(payload, () => stripe.invoices.retrieve(payload.id as string));
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleCheckoutCompleted(
  supabase: Db,
  session: Stripe.Checkout.Session,
  stripeEventId: string,
) {
  const customerId = customerIdOf(session.customer);
  const { tenantId, linkExpected } = await resolveTenant(stripe, supabase, customerId);
  if (!tenantId) {
    if (!linkExpected) {
      // Checkout not created by Trackbliss (Payment Link, dashboard, other
      // Fambliss product in the shared Stripe account) — not ours. Finish as
      // processed so Stripe does not retry or disable the endpoint.
      console.warn(`Ignoring checkout ${session.id}: customer ${customerId ?? '(none)'} has no tenant link`);
      return;
    }
    // Tenant link expected but not resolvable: fail so Stripe retries and
    // the stripe_events row shows the paid-but-unmapped checkout.
    throw new Error(`No tenant for Stripe customer ${customerId} (session ${session.id})`);
  }
  if (session.metadata?.tenant_id && session.metadata.tenant_id !== tenantId) {
    console.warn('Session metadata tenant_id ignored (does not match customer tenant):', session.id);
  }

  if (session.mode === 'payment') {
    if (session.payment_status !== 'paid') {
      console.log(`Checkout ${session.id} not paid yet (${session.payment_status}); waiting for async event`);
      return;
    }
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
    const { credits, packs, unknownPriceIds } = sumPurchasedCredits(
      lineItems.data.map((li: Stripe.LineItem) => ({ price: li.price, quantity: li.quantity })),
    );
    if (unknownPriceIds.length > 0) {
      console.warn('Checkout contains non-allowlisted prices:', unknownPriceIds.join(','));
    }
    if (credits <= 0) return;

    const { data, error } = await supabase.rpc('grant_purchased_credits', {
      p_tenant_id: tenantId,
      p_amount: credits,
      p_session_id: session.id,
      p_description: `Purchased ${packs.join('+')} credit pack (${credits} credits)`,
      p_metadata: { credit_pack: packs.join('+'), stripe_event_id: stripeEventId },
    });
    if (error) throw new Error(`grant_purchased_credits failed: ${error.message}`);
    console.log('Credit grant result:', JSON.stringify(data));
    return;
  }

  if (session.mode !== 'subscription' || !session.subscription) return;

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer'] });
  if (customerIdOf(subscription.customer) !== customerId) {
    throw new Error(`Subscription ${subscriptionId} does not belong to checkout customer`);
  }

  const plan = await syncSubscription(supabase, tenantId, subscription, { activatedNow: true, takeover: true });
  if (!plan || !subscriptionGrantsAccess(subscription.status)) return;

  try {
    const customer = subscription.customer as Stripe.Customer | null;
    const nextBilling = subscriptionPeriod(subscription).end;
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
        next_billing_date: nextBilling ? nextBilling.slice(0, 10) : '',
        portal_url: portalUrl(),
      },
      metadata: {
        tenant_id: tenantId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      },
    });
  } catch (mailErr) {
    console.warn('[stripe-webhook] subscription.confirmed mail-hub post failed:', mailErr);
  }
}

async function handleSubscriptionUpdated(supabase: Db, subscription: Stripe.Subscription, created: boolean) {
  const customerId = customerIdOf(subscription.customer);
  const tenantId = await resolveTenantId(stripe, supabase, customerId);
  if (!tenantId) {
    console.error('No tenant found for Stripe customer:', customerId);
    return;
  }
  // A newly created subscription is an explicit purchase and may supersede
  // the stored plan sub; updates of other (old) subs never override it.
  await syncSubscription(supabase, tenantId, subscription, { takeover: created });
}

async function handleSubscriptionDeleted(
  supabase: Db,
  subscription: Stripe.Subscription,
  stripeEventId: string,
) {
  const customerId = customerIdOf(subscription.customer);
  const tenantId = await resolveTenantId(stripe, supabase, customerId);
  if (!tenantId) return;

  // Downgrade only when the deleted sub IS the tenant's current plan sub —
  // an old sub left over after an upgrade must not drop a paid plan.
  const planSubId = await planSubscriptionIdOf(supabase, tenantId);
  const isPlanSubscription = planSubId === subscription.id;
  const now = new Date().toISOString();

  if (isPlanSubscription) {
    await supabase
      .from('billing_subscriptions')
      .update({ plan: 'free', status: 'canceled', cancel_at_period_end: false, updated_at: now })
      .eq('tenant_id', tenantId);
    await supabase.from('tenants').update({ plan: 'free' }).eq('id', tenantId);
    await setMonthlyAllowance(supabase, tenantId, 'free');
  }

  // Cancel the modules that belonged to this subscription. Legacy rows stored
  // the subscription id instead of the item id, so match both.
  const itemIds = [...subscription.items.data.map((i: Stripe.SubscriptionItem) => i.id), subscription.id];
  await supabase
    .from('billing_module_subscriptions')
    .update({ status: 'canceled', canceled_at: now })
    .eq('tenant_id', tenantId)
    .in('stripe_subscription_item_id', itemIds)
    .neq('status', 'canceled');

  if (!isPlanSubscription) return;

  // Fire-and-forget cancellation mail. access_until = current_period_end.
  try {
    const customer = await stripe.customers.retrieve(customerId as string);
    if (customer && !customer.deleted) {
      const c = customer as Stripe.Customer;
      const periodEnd = subscriptionPeriod(subscription).end;
      const cancelDate = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date();
      await postToMailHub({
        eventType: 'subscription.cancelled',
        source: 'fambliss-plus',
        sourceEventId: `subscription.cancelled:${stripeEventId}`,
        recipientEmail: c.email || '',
        language: pickLanguageFromCustomer(c, null),
        userType: 'fambliss_plus',
        context: {
          customer_first_name: extractFirstName(c.name),
          cancellation_date: cancelDate.toISOString().slice(0, 10),
          access_until: periodEnd ? periodEnd.slice(0, 10) : '',
          reactivate_url: `${portalUrl()}/account/billing`,
        },
        metadata: {
          tenant_id: tenantId,
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
async function handleTrialWillEnd(supabase: Db, subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer) as string;
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) return;
    const c = customer as Stripe.Customer;
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    await postToMailHub({
      eventType: 'subscription.trial_ending',
      source: 'fambliss-plus',
      // Dedup key anchored on the subscription id so the cron's backup path
      // uses the SAME key and the receiver skips the duplicate.
      sourceEventId: `trial_ending:${subscription.id}`,
      recipientEmail: c.email || '',
      language: pickLanguageFromCustomer(c, null),
      userType: 'fambliss_plus',
      context: {
        customer_first_name: extractFirstName(c.name),
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

async function handleInvoicePaid(supabase: Db, invoice: Stripe.Invoice) {
  const tenantId = await resolveTenantId(stripe, supabase, customerIdOf(invoice.customer));
  if (!tenantId) return;

  await upsertInvoice(supabase, tenantId, invoice, 'paid');

  // Reset monthly credits only on a renewal of the PLAN subscription
  // (module renewals must not refill AI credits).
  if (invoice.billing_reason !== 'subscription_cycle') return;
  const planSubId = await planSubscriptionIdOf(supabase, tenantId);
  if (!planSubId || planSubId !== invoiceSubscriptionId(invoice)) return;

  const { data: credits } = await supabase
    .from('billing_credits')
    .select('monthly_allowance, purchased_balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('billing_credits')
    .update({ monthly_used: 0, monthly_reset_at: now, updated_at: now })
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`monthly reset failed: ${error.message}`);

  await supabase.from('billing_credit_transactions').insert({
    tenant_id: tenantId,
    type: 'monthly_reset',
    amount: credits?.monthly_allowance || 0,
    balance_after: (credits?.monthly_allowance || 0) + (credits?.purchased_balance || 0),
    source: 'monthly',
    description: 'Monthly credit reset on billing cycle',
    metadata: { stripe_invoice_id: invoice.id },
  });
}

async function handleInvoicePaymentFailed(
  supabase: Db,
  invoice: Stripe.Invoice,
  stripeEventId: string,
  stripeEventType: string,
) {
  const customerId = customerIdOf(invoice.customer) as string;
  const tenantId = await resolveTenantId(stripe, supabase, customerId);
  if (!tenantId) return;

  const { data: tenant } = await supabase.from('tenants').select('plan').eq('id', tenantId).maybeSingle();

  const planSubId = await planSubscriptionIdOf(supabase, tenantId);
  if (planSubId && planSubId === invoiceSubscriptionId(invoice)) {
    await supabase
      .from('billing_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);
  }

  await upsertInvoice(supabase, tenantId, invoice, 'open');

  // Fire-and-forget payment-failed mail for BOTH payment_failed and
  // payment_action_required (SCA / 3DS); metadata.stripe_event_type tells
  // analytics apart.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      const c = customer as Stripe.Customer;
      await postToMailHub({
        eventType: 'subscription.payment_failed',
        source: 'fambliss-plus',
        sourceEventId: `subscription.payment_failed:${stripeEventId}`,
        recipientEmail: c.email || '',
        language: pickLanguageFromCustomer(c, null),
        userType: 'fambliss_plus',
        context: {
          customer_first_name: extractFirstName(c.name),
          plan_name: humanPlanName((tenant?.plan as string | null) ?? null),
          retry_url: invoice.hosted_invoice_url || `${portalUrl()}/account/billing`,
          update_payment_url: `${portalUrl()}/account/billing`,
        },
        metadata: {
          tenant_id: tenantId,
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
