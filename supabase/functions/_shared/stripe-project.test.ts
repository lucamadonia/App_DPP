/**
 * Deno tests for the shared-Stripe-account project gate
 * (run: deno test -A supabase/functions/_shared/stripe-project.test.ts).
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  eventProjectScope,
  invoiceSubscriptionMetadata,
  projectOf,
  projectScope,
  STRIPE_PROJECT,
  withProjectTag,
} from './stripe-project.ts';

Deno.test('projectScope: own, foreign, untagged', () => {
  assertEquals(projectScope({ project: 'TRACK' }), 'own');
  assertEquals(projectScope({ project: ' track ' }), 'own');
  for (const code of ['EVENT', 'WEALTH', 'BOOK', 'CONTACT', 'something-else']) {
    assertEquals(projectScope({ project: code }), 'foreign');
  }
  assertEquals(projectScope({}), 'untagged');
  assertEquals(projectScope({ project: '' }), 'untagged');
  assertEquals(projectScope({ project: '   ' }), 'untagged');
  assertEquals(projectScope(null), 'untagged');
  assertEquals(projectScope(undefined), 'untagged');
  assertEquals(projectScope({ tenant_id: 'x' }), 'untagged');
  assertEquals(projectOf({ project: 'wealth' }), 'WEALTH');
});

Deno.test('withProjectTag adds TRACK and cannot be overridden by the caller', () => {
  assertEquals(withProjectTag(), { project: STRIPE_PROJECT });
  assertEquals(withProjectTag({ tenant_id: 't1', user_id: 'u1' }), {
    tenant_id: 't1',
    user_id: 'u1',
    project: 'TRACK',
  });
  assertEquals(withProjectTag({ project: 'WEALTH' }).project, 'TRACK');
});

Deno.test('invoice subscription metadata: basil, legacy and expanded shapes', () => {
  assertEquals(
    invoiceSubscriptionMetadata({ parent: { subscription_details: { metadata: { project: 'WEALTH' } } } }),
    { project: 'WEALTH' },
  );
  assertEquals(invoiceSubscriptionMetadata({ subscription_details: { metadata: { project: 'EVENT' } } }), {
    project: 'EVENT',
  });
  assertEquals(invoiceSubscriptionMetadata({ subscription: { id: 'sub_1', metadata: { project: 'TRACK' } } }), {
    project: 'TRACK',
  });
  assertEquals(invoiceSubscriptionMetadata({ subscription: 'sub_1' }), null);
  assertEquals(invoiceSubscriptionMetadata(null), null);
});

Deno.test('Wealthbliss checkout (project=WEALTH, household_id, no user_id) is foreign', () => {
  assertEquals(
    eventProjectScope({
      type: 'checkout.session.completed',
      data: {
        object: {
          object: 'checkout.session',
          customer: 'cus_wealth',
          customer_details: { email: 'same-person@example.com' },
          metadata: { project: 'WEALTH', household_id: 'hh_1' },
        },
      },
    }),
    'foreign',
  );
});

Deno.test('subscription events use the subscription metadata', () => {
  for (const type of [
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
  ]) {
    assertEquals(eventProjectScope({ type, data: { object: { metadata: { project: 'EVENT' } } } }), 'foreign');
    assertEquals(eventProjectScope({ type, data: { object: { metadata: { project: 'TRACK' } } } }), 'own');
    assertEquals(eventProjectScope({ type, data: { object: { metadata: {} } } }), 'untagged');
  }
});

Deno.test('invoice events use the subscription metadata, then the invoice metadata', () => {
  for (const type of ['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required']) {
    // basil (>= 2025-03-31)
    assertEquals(
      eventProjectScope({
        type,
        data: { object: { metadata: {}, parent: { subscription_details: { metadata: { project: 'WEALTH' } } } } },
      }),
      'foreign',
    );
    // pre-basil
    assertEquals(
      eventProjectScope({ type, data: { object: { subscription_details: { metadata: { project: 'TRACK' } } } } }),
      'own',
    );
    // subscription untagged, invoice itself tagged
    assertEquals(
      eventProjectScope({
        type,
        data: { object: { metadata: { project: 'BOOK' }, subscription_details: { metadata: {} } } },
      }),
      'foreign',
    );
    // legacy invoice: no tag anywhere → resolved via our DB only
    assertEquals(eventProjectScope({ type, data: { object: { subscription: 'sub_legacy' } } }), 'untagged');
  }
});

Deno.test('subscription tag wins over a conflicting invoice tag', () => {
  assertEquals(
    eventProjectScope({
      type: 'invoice.paid',
      data: { object: { metadata: { project: 'TRACK' }, subscription_details: { metadata: { project: 'EVENT' } } } },
    }),
    'foreign',
  );
});

Deno.test('malformed payloads never throw and count as untagged', () => {
  assertEquals(eventProjectScope({ type: 'checkout.session.completed' }), 'untagged');
  assertEquals(eventProjectScope({ type: 'invoice.paid', data: { object: 'in_1' } }), 'untagged');
  assertEquals(eventProjectScope({ type: 'customer.subscription.updated', data: {} }), 'untagged');
});
