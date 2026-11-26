/**
 * Customer-facing review link for a feedback request token.
 *
 * Tenants with their own storefront review page
 * (`tenants.settings.feedback.storefrontReviewUrl`, https only) get
 * `<storefrontReviewUrl>?t=<token>`; everyone else gets the built-in
 * `<base>/feedback/<token>` form.
 *
 * Same rule as get_public_shipment_by_token (20261119_feedback_storefront.sql)
 * and buildReviewUrl() in supabase/functions/engagement-mail-cron (Deno, cannot
 * import from src). Keep the three in sync.
 */
export function normalizeStorefrontReviewUrl(raw: unknown): string | null {
  const url = typeof raw === 'string' ? raw.trim() : '';
  return /^https:\/\/\S+$/.test(url) ? url : null;
}

export function buildFeedbackReviewUrl(
  storefrontReviewUrl: unknown,
  token: string,
  fallbackBaseUrl: string,
): string {
  const storefront = normalizeStorefrontReviewUrl(storefrontReviewUrl);
  if (!storefront) {
    return `${fallbackBaseUrl.replace(/\/+$/, '')}/feedback/${encodeURIComponent(token)}`;
  }
  const sep = storefront.includes('?') ? '&' : '?';
  return `${storefront}${sep}t=${encodeURIComponent(token)}`;
}
