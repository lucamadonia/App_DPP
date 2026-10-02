/**
 * Pure entitlement derivation for the Stripe webhook.
 *
 * Entitlements come ONLY from purchased price IDs (server-side allowlist in
 * _shared/stripe-catalog.ts) or, as a fallback, from price metadata that is
 * maintained in our own Stripe account (trackbliss_plan / trackbliss_module).
 * Checkout-session metadata is client-influenced and is never consulted.
 */

import { resolvePrice, type BillingPlanId } from '../_shared/stripe-catalog.ts';

export interface PriceLike {
  id: string;
  metadata?: Record<string, string> | null;
}

export interface SubscriptionItemLike {
  id: string;
  price: PriceLike;
  quantity?: number | null;
}

export interface LineItemLike {
  price?: PriceLike | null;
  quantity?: number | null;
}

export interface SubscriptionEntitlements {
  plan: BillingPlanId | null;
  modules: Array<{ moduleId: string; itemId: string }>;
  unknownPriceIds: string[];
}

const MODULE_ID_RE = /^[a-z_]{3,40}$/;

export function entitlementFromPrice(price: PriceLike):
  | { kind: 'plan'; plan: BillingPlanId }
  | { kind: 'module'; module: string }
  | { kind: 'credits'; credits: number; pack: string }
  | null {
  const entry = resolvePrice(price.id);
  if (entry) {
    if (entry.kind === 'plan') return { kind: 'plan', plan: entry.plan };
    if (entry.kind === 'module') return { kind: 'module', module: entry.module };
    return { kind: 'credits', credits: entry.credits, pack: entry.pack };
  }
  // Fallback: price metadata maintained in our Stripe account.
  const meta = price.metadata || {};
  if (meta.trackbliss_plan === 'pro' || meta.trackbliss_plan === 'enterprise') {
    return { kind: 'plan', plan: meta.trackbliss_plan };
  }
  if (meta.trackbliss_module && MODULE_ID_RE.test(meta.trackbliss_module)) {
    return { kind: 'module', module: meta.trackbliss_module };
  }
  return null;
}

export function deriveSubscriptionEntitlements(items: SubscriptionItemLike[]): SubscriptionEntitlements {
  const result: SubscriptionEntitlements = { plan: null, modules: [], unknownPriceIds: [] };
  for (const item of items) {
    const ent = entitlementFromPrice(item.price);
    if (!ent) {
      result.unknownPriceIds.push(item.price.id);
      continue;
    }
    if (ent.kind === 'plan') {
      // Highest plan wins if (unexpectedly) several plan items exist.
      if (result.plan !== 'enterprise') result.plan = ent.plan;
    } else if (ent.kind === 'module') {
      result.modules.push({ moduleId: ent.module, itemId: item.id });
    } else {
      // Credit prices are one-time; never grant credits from a subscription.
      result.unknownPriceIds.push(item.price.id);
    }
  }
  return result;
}

/** Total credits purchased in a one-time checkout, from allowlisted prices only. */
export function sumPurchasedCredits(lineItems: LineItemLike[]): {
  credits: number;
  packs: string[];
  unknownPriceIds: string[];
} {
  let credits = 0;
  const packs: string[] = [];
  const unknownPriceIds: string[] = [];
  for (const li of lineItems) {
    const priceId = li.price?.id;
    if (!priceId) continue;
    const entry = resolvePrice(priceId);
    if (!entry || entry.kind !== 'credits') {
      unknownPriceIds.push(priceId);
      continue;
    }
    const qty = Math.max(1, Math.min(100, Math.floor(li.quantity ?? 1)));
    credits += entry.credits * qty;
    packs.push(entry.pack);
  }
  return { credits, packs, unknownPriceIds };
}

export type DbSubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'paused';

/** Map Stripe subscription status onto the billing_subscriptions CHECK set. */
export function mapSubscriptionStatus(status: string): DbSubscriptionStatus {
  switch (status) {
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
    case 'trialing':
    case 'paused':
      return status;
    case 'unpaid':
      return 'past_due';
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'incomplete';
  }
}

/** Whether a subscription in this Stripe status should grant its entitlements. */
export function subscriptionGrantsAccess(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export function moduleStatusFor(status: string): 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  return 'canceled';
}
