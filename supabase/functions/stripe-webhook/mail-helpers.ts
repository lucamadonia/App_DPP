/**
 * Mail helpers for stripe-webhook (lifecycle mails via the central mail hub).
 */

import type Stripe from 'https://esm.sh/stripe@14?target=deno';

export function portalUrl(): string {
  return (Deno.env.get('FAMBLISS_PLUS_PORTAL_URL') || 'https://app.fambliss.eu').replace(/\/+$/, '');
}

/** "Julia Schmidt" → "Julia"; "" / null → "" (templates handle empty gracefully). */
export function extractFirstName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/** Map internal plan slug to a human-readable name for the mail. */
export function humanPlanName(plan: string | null | undefined): string {
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
export function pickLanguageFromCustomer(
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
