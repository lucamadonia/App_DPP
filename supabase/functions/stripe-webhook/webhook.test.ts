/**
 * Deno tests for stripe-webhook (run: deno test -A supabase/functions/stripe-webhook/).
 *
 * - QA-1: a correctly signed fixture must verify with the async SubtleCrypto
 *   path; a tampered body / wrong secret / stale timestamp must be rejected.
 * - SEC-05/SRE-05: entitlements come only from allowlisted price IDs, never
 *   from metadata.
 */

import { assert, assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { verifyStripeEvent } from './verify.ts';
import { deriveSubscriptionEntitlements, mapSubscriptionStatus, sumPurchasedCredits } from './entitlements.ts';
import { getAllowedRedirectOrigins, isAllowedRedirectUrl, resolvePrice } from '../_shared/stripe-catalog.ts';
import { invoiceSubscriptionId, mayWritePlan, refetch, subscriptionPeriod, unixToIso } from './billing-sync.ts';

const SECRET = 'whsec_test_fixture_secret';
const stripe = new Stripe('sk_test_dummy');

const fixture = JSON.stringify({
  id: 'evt_test_fixture_1',
  object: 'event',
  type: 'checkout.session.completed',
  api_version: '2023-10-16',
  created: 1_759_300_000,
  data: {
    object: {
      id: 'cs_test_123',
      object: 'checkout.session',
      mode: 'payment',
      payment_status: 'paid',
      customer: 'cus_test_123',
      metadata: { tenant_id: 'attacker-chosen', credits: '1000000' },
    },
  },
});

async function sign(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

Deno.test('verifyStripeEvent accepts a correctly signed fixture (async SubtleCrypto)', async () => {
  const header = await sign(fixture, SECRET);
  const event = await verifyStripeEvent(stripe, fixture, header, SECRET);
  assertEquals(event.id, 'evt_test_fixture_1');
  assertEquals(event.type, 'checkout.session.completed');
});

Deno.test('verifyStripeEvent rejects a tampered body', async () => {
  const header = await sign(fixture, SECRET);
  const tampered = fixture.replace('1000000', '9999999');
  await assertRejects(() => verifyStripeEvent(stripe, tampered, header, SECRET));
});

Deno.test('verifyStripeEvent rejects a wrong secret', async () => {
  const header = await sign(fixture, 'whsec_other');
  await assertRejects(() => verifyStripeEvent(stripe, fixture, header, SECRET));
});

Deno.test('verifyStripeEvent rejects a stale timestamp', async () => {
  const header = await sign(fixture, SECRET, Math.floor(Date.now() / 1000) - 3600);
  await assertRejects(() => verifyStripeEvent(stripe, fixture, header, SECRET));
});

Deno.test('verifyStripeEvent refuses to run without a configured secret', async () => {
  const header = await sign(fixture, SECRET);
  await assertRejects(() => verifyStripeEvent(stripe, fixture, header, ''));
});

Deno.test('credits come from allowlisted prices only', () => {
  const small = sumPurchasedCredits([{ price: { id: 'price_1ThC4n9GJBS1rMz11s9rYSRp' }, quantity: 1 }]);
  assertEquals(small.credits, 50);

  const unknown = sumPurchasedCredits([
    { price: { id: 'price_attacker', metadata: { trackbliss_credits: '1000000' } }, quantity: 1 },
  ]);
  assertEquals(unknown.credits, 0);
  assertEquals(unknown.unknownPriceIds, ['price_attacker']);

  // A plan price is not a credit pack.
  const plan = sumPurchasedCredits([{ price: { id: 'price_1ThC4i9GJBS1rMz1aBG0g5ke' }, quantity: 1 }]);
  assertEquals(plan.credits, 0);
});

Deno.test('subscription entitlements derive plan and modules from price ids', () => {
  const ent = deriveSubscriptionEntitlements([
    { id: 'si_plan', price: { id: 'price_1ThC4j9GJBS1rMz1MrcbbRQ9' } },
    { id: 'si_mod', price: { id: 'price_1ThC4l9GJBS1rMz13Cq2v7ef' } },
  ]);
  assertEquals(ent.plan, 'enterprise');
  assertEquals(ent.modules, [{ moduleId: 'supplier_portal', itemId: 'si_mod' }]);

  const moduleOnly = deriveSubscriptionEntitlements([
    { id: 'si_mod', price: { id: 'price_1ThC4m9GJBS1rMz1IInGn8M0' } },
  ]);
  assertEquals(moduleOnly.plan, null);

  // Credit prices inside a subscription never grant anything.
  const creditsInSub = deriveSubscriptionEntitlements([
    { id: 'si_x', price: { id: 'price_1ThC4o9GJBS1rMz125SKXxqb' } },
  ]);
  assertEquals(creditsInSub.plan, null);
  assertEquals(creditsInSub.modules.length, 0);
});

Deno.test('status mapping stays within the billing_subscriptions CHECK set', () => {
  assertEquals(mapSubscriptionStatus('unpaid'), 'past_due');
  assertEquals(mapSubscriptionStatus('incomplete_expired'), 'canceled');
  assertEquals(mapSubscriptionStatus('trialing'), 'trialing');
});

Deno.test('catalog and redirect allowlist', () => {
  assert(resolvePrice('price_1ThC4n9GJBS1rMz1UCruqASu')?.kind === 'credits');
  assertEquals(resolvePrice('price_placeholder_wh_starter'), null);
  assert(isAllowedRedirectUrl('https://trackbliss.eu/settings/billing?credits=success'));
  assert(isAllowedRedirectUrl('https://trackbliss.com/settings/billing'));
  assert(isAllowedRedirectUrl('https://www.trackbliss.com/settings/billing'));
  assert(isAllowedRedirectUrl('https://app-dpp.vercel.app/settings/billing'));
  // No *.vercel.app wildcard: any Vercel account could claim these names.
  assert(!isAllowedRedirectUrl('https://app-dpp-evil.vercel.app/settings/billing'));
  assert(!isAllowedRedirectUrl('https://app-dpp-git-feature-x.vercel.app/settings/billing'));
  // Localhost only behind the explicit dev flag.
  assert(!isAllowedRedirectUrl('http://localhost:5173/settings/billing', getAllowedRedirectOrigins('', false)));
  assert(isAllowedRedirectUrl('http://localhost:5173/settings/billing', getAllowedRedirectOrigins('', true)));
  // Previews are added as exact origins via APP_ALLOWED_ORIGINS.
  const withPreview = getAllowedRedirectOrigins('https://App-DPP-Git-X-Team.vercel.app/, http://evil.example', false);
  assert(isAllowedRedirectUrl('https://app-dpp-git-x-team.vercel.app/x', withPreview));
  assert(!isAllowedRedirectUrl('http://evil.example/x', withPreview));
  assert(!isAllowedRedirectUrl('https://evil.example/settings/billing'));
  assert(!isAllowedRedirectUrl('https://trackbliss.eu.evil.example/'));
  assert(!isAllowedRedirectUrl('javascript:alert(1)'));
});

Deno.test('only the current plan subscription may write the plan', () => {
  const live = { subscriptionId: 'sub_enterprise', status: 'active' };
  // Stale updates / renewals of an old Pro sub after an upgrade are ignored.
  assertEquals(mayWritePlan(live, 'sub_old_pro', { grants: true }), false);
  assertEquals(mayWritePlan(live, 'sub_old_pro', { grants: false }), false);
  // The current sub always may.
  assertEquals(mayWritePlan(live, 'sub_enterprise', { grants: false }), true);
  // A new purchase (checkout / subscription.created) that grants access takes over.
  assertEquals(mayWritePlan(live, 'sub_new', { takeover: true, grants: true }), true);
  assertEquals(mayWritePlan(live, 'sub_new', { takeover: true, grants: false }), false);
  // No stored sub, or a stored sub that is no longer live.
  assertEquals(mayWritePlan(null, 'sub_x', { grants: true }), true);
  assertEquals(mayWritePlan({ subscriptionId: null, status: null }, 'sub_x', { grants: true }), true);
  assertEquals(mayWritePlan({ subscriptionId: 'sub_old', status: 'canceled' }, 'sub_x', { grants: true }), true);
});

// Webhook payloads use the endpoint's API version. Since 2025-03-31.basil the
// period fields live on the items and invoice.subscription moved to
// invoice.parent.subscription_details.subscription.
const basilSubscription = {
  id: 'sub_basil',
  object: 'subscription',
  status: 'active',
  cancel_at_period_end: false,
  trial_end: null,
  customer: 'cus_test_123',
  items: {
    object: 'list',
    data: [
      { id: 'si_1', current_period_start: 1_759_300_000, current_period_end: 1_761_978_400, price: { id: 'price_x' } },
    ],
  },
};

Deno.test('basil-shaped subscription: period read from items, never throws', () => {
  const p = subscriptionPeriod(basilSubscription as unknown as Stripe.Subscription);
  assertEquals(p.start, new Date(1_759_300_000 * 1000).toISOString());
  assertEquals(p.end, new Date(1_761_978_400 * 1000).toISOString());

  const legacy = subscriptionPeriod({
    ...basilSubscription,
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_592_000,
  } as unknown as Stripe.Subscription);
  assertEquals(legacy.start, new Date(1_700_000_000 * 1000).toISOString());

  const empty = subscriptionPeriod({ id: 'sub_x', items: { data: [{ id: 'si' }] } } as unknown as Stripe.Subscription);
  assertEquals(empty, { start: null, end: null });
  assertEquals(unixToIso(undefined), null);
  assertEquals(unixToIso(Number.NaN), null);
});

Deno.test('basil-shaped invoice: subscription id read from parent', () => {
  const basil = {
    id: 'in_basil',
    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_basil' } },
  };
  assertEquals(invoiceSubscriptionId(basil as unknown as Stripe.Invoice), 'sub_basil');
  assertEquals(invoiceSubscriptionId({ id: 'in_old', subscription: 'sub_old' } as unknown as Stripe.Invoice), 'sub_old');
  assertEquals(
    invoiceSubscriptionId({ id: 'in_exp', subscription: { id: 'sub_exp' } } as unknown as Stripe.Invoice),
    'sub_exp',
  );
  assertEquals(invoiceSubscriptionId({ id: 'in_none', parent: null } as unknown as Stripe.Invoice), null);
});

Deno.test('refetch prefers the pinned-version object, falls back only when missing', async () => {
  assertEquals(await refetch('payload', () => Promise.resolve('fresh')), 'fresh');
  const missing = Object.assign(new Error('No such subscription'), { code: 'resource_missing', statusCode: 404 });
  assertEquals(await refetch('payload', () => Promise.reject(missing)), 'payload');
  await assertRejects(() => refetch('payload', () => Promise.reject(new Error('network'))));
});
