/**
 * Stripe webhook signature verification for the Deno edge runtime.
 *
 * stripe@14 (`?target=deno`) uses the SubtleCrypto provider, which only
 * works asynchronously. The synchronous `constructEvent` therefore throws
 * `SubtleCryptoProvider cannot be used in a synchronous context` for every
 * event (QA-1). Always go through `constructEventAsync` with an explicit
 * SubtleCrypto provider.
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** Default tolerance (seconds) between the signed timestamp and now. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export async function verifyStripeEvent(
  stripe: Stripe,
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
): Promise<Stripe.Event> {
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return await stripe.webhooks.constructEventAsync(
    rawBody,
    signatureHeader,
    webhookSecret,
    toleranceSeconds,
    cryptoProvider,
  );
}
