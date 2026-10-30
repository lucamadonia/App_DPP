/**
 * Stripe project isolation for the Stripe account shared by several
 * MYFAMBLISS apps (EventBliss = EVENT, Trackbliss = TRACK,
 * Wealthbliss = WEALTH, BookingBliss = BOOK, ContactBliss = CONTACT).
 *
 * Stripe delivers every event to every endpoint subscribed to its type, so
 * the Trackbliss webhook also receives the other apps' checkouts,
 * subscriptions and invoices.
 *
 * Contract:
 *   - Every Stripe object Trackbliss creates carries metadata.project = TRACK
 *     (use withProjectTag()).
 *   - The webhook ignores (200, no side effects) every event whose object is
 *     tagged with ANOTHER project.
 *   - Untagged (legacy) objects are processed only when they resolve to a
 *     Trackbliss tenant through Stripe ids stored in our own DB (or a
 *     tenant id in the customer metadata that exists). Never by email.
 *
 * Pure functions only (no Stripe / Supabase imports) so the module is
 * unit-testable and reusable by every function that talks to Stripe.
 */

export const STRIPE_PROJECT = 'TRACK';
export const STRIPE_PROJECT_KEY = 'project';

/** own = tagged TRACK, foreign = tagged with another project, untagged = legacy / unknown. */
export type ProjectScope = 'own' | 'foreign' | 'untagged';

type LooseRecord = Record<string, unknown>;

function asRecord(v: unknown): LooseRecord | null {
  return v && typeof v === 'object' ? (v as LooseRecord) : null;
}

/** Normalised project code of a metadata object, or null when untagged. */
export function projectOf(metadata: unknown): string | null {
  const value = asRecord(metadata)?.[STRIPE_PROJECT_KEY];
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return code || null;
}

export function projectScope(metadata: unknown): ProjectScope {
  const code = projectOf(metadata);
  if (!code) return 'untagged';
  return code === STRIPE_PROJECT ? 'own' : 'foreign';
}

/** Metadata with the Trackbliss project tag added (overrides any caller value). */
export function withProjectTag<T extends Record<string, string>>(
  metadata?: T,
): T & { project: string } {
  return { ...(metadata ?? ({} as T)), [STRIPE_PROJECT_KEY]: STRIPE_PROJECT } as T & { project: string };
}

/**
 * Metadata of the subscription an invoice belongs to, API-version tolerant:
 *   - >= 2025-03-31.basil: invoice.parent.subscription_details.metadata
 *   - older versions:      invoice.subscription_details.metadata
 *   - expanded:            invoice.subscription.metadata
 */
export function invoiceSubscriptionMetadata(invoice: unknown): LooseRecord | null {
  const inv = asRecord(invoice);
  if (!inv) return null;
  return asRecord(asRecord(asRecord(inv.parent)?.subscription_details)?.metadata)
    ?? asRecord(asRecord(inv.subscription_details)?.metadata)
    ?? asRecord(asRecord(inv.subscription)?.metadata);
}

/**
 * Project scope of the object a webhook event is about. Subscription and
 * checkout events use the object's own metadata; invoice events use the
 * metadata of their subscription, falling back to the invoice's own.
 */
export function eventProjectScope(event: { type: string; data?: { object?: unknown } }): ProjectScope {
  const obj = event.data?.object;
  if (event.type.startsWith('invoice.')) {
    const fromSubscription = projectScope(invoiceSubscriptionMetadata(obj));
    if (fromSubscription !== 'untagged') return fromSubscription;
  }
  return projectScope(asRecord(obj)?.metadata);
}
