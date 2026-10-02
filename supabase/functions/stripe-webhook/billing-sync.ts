/**
 * Billing state sync helpers for stripe-webhook: tenant resolution,
 * subscription → plan/module entitlements, invoices.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'https://esm.sh/stripe@14?target=deno';
import { PLAN_MONTHLY_CREDITS } from '../_shared/stripe-catalog.ts';
import {
  deriveSubscriptionEntitlements,
  mapSubscriptionStatus,
  moduleStatusFor,
  subscriptionGrantsAccess,
} from './entitlements.ts';

export type Db = SupabaseClient;

// ============================================
// TENANT RESOLUTION
// ============================================

export function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

export interface TenantResolution {
  tenantId: string | null;
  /**
   * True when the customer carries a tenant link that should have resolved,
   * i.e. the event belongs to this app. False for customers created outside
   * Trackbliss (Payment Links, dashboard, other Fambliss products in the
   * shared Stripe account).
   */
  linkExpected: boolean;
}

/**
 * Resolve the tenant for a Stripe customer. Primary source is
 * tenants.stripe_customer_id (unique, server-written). Fallback: the
 * customer's own metadata.tenant_id — written by create-checkout-session
 * when it created the customer — accepted only when that tenant has no
 * other Stripe customer linked yet. Transient errors (DB, Stripe API) throw.
 */
export async function resolveTenant(
  stripe: Stripe,
  supabase: Db,
  customerId: string | null,
): Promise<TenantResolution> {
  if (!customerId) return { tenantId: null, linkExpected: false };
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(`tenant lookup failed: ${error.message}`);
  if (data?.id) return { tenantId: data.id as string, linkExpected: true };

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return { tenantId: null, linkExpected: false };
  const metaTenant = (customer as Stripe.Customer).metadata?.tenant_id;
  if (!metaTenant || !/^[0-9a-f-]{36}$/i.test(metaTenant)) return { tenantId: null, linkExpected: false };

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, stripe_customer_id')
    .eq('id', metaTenant)
    .maybeSingle();
  if (tenantErr) throw new Error(`tenant lookup failed: ${tenantErr.message}`);
  if (!tenant) return { tenantId: null, linkExpected: true };
  const linked = tenant.stripe_customer_id as string | null;
  if (linked && !linked.startsWith('pending_') && linked !== customerId) {
    console.error('Customer metadata tenant is linked to a different Stripe customer:', metaTenant);
    return { tenantId: null, linkExpected: true };
  }
  // Conditional link: never overwrite a customer linked concurrently.
  const { data: updated, error: linkErr } = await supabase
    .from('tenants')
    .update({ stripe_customer_id: customerId })
    .eq('id', metaTenant)
    .or(`stripe_customer_id.is.null,stripe_customer_id.like.pending_%,stripe_customer_id.eq.${customerId}`)
    .select('id');
  if (linkErr) throw new Error(`tenant link failed: ${linkErr.message}`);
  if (!updated || updated.length === 0) return { tenantId: null, linkExpected: true };
  return { tenantId: metaTenant, linkExpected: true };
}

export async function resolveTenantId(
  stripe: Stripe,
  supabase: Db,
  customerId: string | null,
): Promise<string | null> {
  return (await resolveTenant(stripe, supabase, customerId)).tenantId;
}

// ============================================
// SUBSCRIPTION SYNC
// ============================================

export function itemsOf(subscription: Stripe.Subscription) {
  return subscription.items.data.map((i: Stripe.SubscriptionItem) => ({ id: i.id, price: i.price, quantity: i.quantity }));
}

/** DB statuses of billing_subscriptions that still represent a paid plan. */
const LIVE_PLAN_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface StoredPlanSubscription {
  subscriptionId: string | null;
  status: string | null;
}

/**
 * Decide whether `subscriptionId` may write the tenant's plan.
 *
 * A tenant can temporarily hold several plan subscriptions (e.g. an upgrade
 * through a NEW checkout while the old Pro sub keeps running). Only the
 * current plan subscription may change tenants.plan / allowance. Another sub
 * takes over only when no live plan sub is stored, or when it is an explicit
 * new purchase (checkout completion / subscription.created) that grants access.
 */
export function mayWritePlan(
  stored: StoredPlanSubscription | null,
  subscriptionId: string,
  opts: { takeover?: boolean; grants: boolean },
): boolean {
  if (!stored || !stored.subscriptionId) return true;
  if (stored.subscriptionId === subscriptionId) return true;
  if (!stored.status || !LIVE_PLAN_STATUSES.has(stored.status)) return true;
  return Boolean(opts.takeover && opts.grants);
}

/**
 * Apply plan + module entitlements of one Stripe subscription to a tenant.
 * Returns the plan when it was applied as the tenant's plan subscription
 * (null for module-only or superseded subscriptions).
 */
export async function syncSubscription(
  supabase: Db,
  tenantId: string,
  subscription: Stripe.Subscription,
  opts: { activatedNow?: boolean; takeover?: boolean } = {},
): Promise<string | null> {
  const ent = deriveSubscriptionEntitlements(itemsOf(subscription));
  if (ent.unknownPriceIds.length > 0) {
    console.warn('Subscription contains non-allowlisted prices:', ent.unknownPriceIds.join(','));
  }

  const grants = subscriptionGrantsAccess(subscription.status);
  const now = new Date().toISOString();
  let appliedPlan: string | null = null;

  if (ent.plan) {
    const stored = await storedPlanSubscription(supabase, tenantId);
    if (!mayWritePlan(stored, subscription.id, { takeover: opts.takeover, grants })) {
      console.warn(
        `Ignoring plan update from superseded subscription ${subscription.id} (current: ${stored?.subscriptionId})`,
      );
    } else {
      const plan = grants ? ent.plan : 'free';
      const period = subscriptionPeriod(subscription);
      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        stripe_customer_id: customerIdOf(subscription.customer),
        stripe_subscription_id: subscription.id,
        plan,
        status: mapSubscriptionStatus(subscription.status),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        trial_end: unixToIso(subscription.trial_end),
        updated_at: now,
      };
      // Never overwrite a known period with null when a payload lacks it.
      if (period.start) row.current_period_start = period.start;
      if (period.end) row.current_period_end = period.end;
      const { error } = await supabase.from('billing_subscriptions').upsert(row, { onConflict: 'tenant_id' });
      if (error) throw new Error(`billing_subscriptions upsert failed: ${error.message}`);

      const { error: planErr } = await supabase.from('tenants').update({ plan }).eq('id', tenantId);
      if (planErr) throw new Error(`tenants.plan update failed: ${planErr.message}`);
      await setMonthlyAllowance(supabase, tenantId, plan);
      appliedPlan = ent.plan;
    }
  }

  for (const mod of ent.modules) {
    const status = moduleStatusFor(subscription.status);
    const row: Record<string, unknown> = {
      tenant_id: tenantId,
      module_id: mod.moduleId,
      stripe_subscription_item_id: mod.itemId,
      status,
    };
    if (status === 'active' && opts.activatedNow) row.activated_at = now;
    if (status === 'canceled') row.canceled_at = now;
    const { error } = await supabase
      .from('billing_module_subscriptions')
      .upsert(row, { onConflict: 'tenant_id,module_id' });
    if (error) throw new Error(`module upsert failed (${mod.moduleId}): ${error.message}`);
  }

  return appliedPlan;
}

export async function setMonthlyAllowance(supabase: Db, tenantId: string, plan: string) {
  const allowance = PLAN_MONTHLY_CREDITS[plan as keyof typeof PLAN_MONTHLY_CREDITS] ?? PLAN_MONTHLY_CREDITS.free;
  const { error } = await supabase
    .from('billing_credits')
    .upsert({ tenant_id: tenantId, monthly_allowance: allowance, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' });
  if (error) throw new Error(`billing_credits allowance update failed: ${error.message}`);
}

export async function storedPlanSubscription(
  supabase: Db,
  tenantId: string,
): Promise<StoredPlanSubscription | null> {
  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw new Error(`billing_subscriptions lookup failed: ${error.message}`);
  if (!data) return null;
  return {
    subscriptionId: (data.stripe_subscription_id as string | null) ?? null,
    status: (data.status as string | null) ?? null,
  };
}

export async function planSubscriptionIdOf(supabase: Db, tenantId: string): Promise<string | null> {
  return (await storedPlanSubscription(supabase, tenantId))?.subscriptionId ?? null;
}

// ============================================
// API-VERSION-TOLERANT FIELD ACCESS
// ============================================
// Webhook payloads are rendered in the ENDPOINT's API version, not the
// version pinned in the SDK. Since 2025-03-31.basil Stripe moved
// subscription.current_period_* onto the subscription items and replaced
// invoice.subscription with invoice.parent.subscription_details.subscription.
// The handlers re-retrieve objects through the pinned SDK, and these
// readers accept both shapes so a missing field never throws.

/**
 * Re-fetch a webhook object through the pinned SDK. Falls back to the event
 * payload only when Stripe reports the object as gone (resource_missing);
 * any other error throws so Stripe retries the event.
 */
export async function refetch<T>(fallback: T, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (err) {
    const code = (err as { code?: string; statusCode?: number })?.code;
    const status = (err as { statusCode?: number })?.statusCode;
    if (code === 'resource_missing' || status === 404) {
      console.warn('Stripe object no longer retrievable, using event payload');
      return fallback;
    }
    throw err;
  }
}

/** Unix seconds → ISO string; null for missing / invalid values (never throws). */
export function unixToIso(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const d = new Date(value * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type LooseRecord = Record<string, unknown>;

function asRecord(v: unknown): LooseRecord | null {
  return v && typeof v === 'object' ? (v as LooseRecord) : null;
}

/** Billing period of a subscription (pre-basil top level, or basil item level). */
export function subscriptionPeriod(subscription: Stripe.Subscription): { start: string | null; end: string | null } {
  const sub = subscription as unknown as LooseRecord;
  let start = unixToIso(sub.current_period_start);
  let end = unixToIso(sub.current_period_end);
  if (!start || !end) {
    const items = (asRecord(sub.items)?.data as unknown[] | undefined) ?? [];
    const starts = items.map((i) => asRecord(i)?.current_period_start).filter((v): v is number => typeof v === 'number');
    const ends = items.map((i) => asRecord(i)?.current_period_end).filter((v): v is number => typeof v === 'number');
    if (!start && starts.length) start = unixToIso(Math.min(...starts));
    if (!end && ends.length) end = unixToIso(Math.max(...ends));
  }
  return { start, end };
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as LooseRecord;
  const idOf = (sub: unknown): string | null => {
    if (typeof sub === 'string' && sub) return sub;
    const id = asRecord(sub)?.id;
    return typeof id === 'string' && id ? id : null;
  };
  const legacy = idOf(inv.subscription);
  if (legacy) return legacy;
  const details = asRecord(asRecord(inv.parent)?.subscription_details);
  return idOf(details?.subscription);
}

export async function upsertInvoice(supabase: Db, tenantId: string, invoice: Stripe.Invoice, status: 'paid' | 'open') {
  const { error } = await supabase.from('billing_invoices').upsert({
    tenant_id: tenantId,
    stripe_invoice_id: invoice.id,
    stripe_invoice_url: invoice.hosted_invoice_url,
    stripe_pdf_url: invoice.invoice_pdf,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
  }, { onConflict: 'stripe_invoice_id' });
  if (error) throw new Error(`billing_invoices upsert failed: ${error.message}`);
}
