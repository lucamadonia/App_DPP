/**
 * Server-side Stripe price allowlist.
 *
 * The ONLY source of truth for what a Stripe price entitles a tenant to.
 * create-checkout-session rejects any priceId not listed here, and
 * stripe-webhook derives plans / modules / credit amounts exclusively from
 * the purchased price IDs — never from client-supplied session metadata.
 *
 * Keep in sync with src/config/stripe-prices.ts and src/types/billing.ts
 * (CREDIT_PACKS). Placeholder prices (not yet created in Stripe) are
 * intentionally absent, so they cannot be checked out.
 *
 * Optional override: STRIPE_PRICE_CATALOG_JSON (Supabase secret) may hold a
 * JSON object { "<priceId>": CatalogEntry } that is merged on top, e.g. for
 * a Stripe test-mode account.
 */

export type BillingPlanId = 'pro' | 'enterprise';

export type CatalogEntry =
  | { kind: 'plan'; mode: 'subscription'; plan: BillingPlanId; interval: 'monthly' | 'yearly' }
  | { kind: 'module'; mode: 'subscription'; module: string }
  | { kind: 'credits'; mode: 'payment'; pack: string; credits: number };

const BUILTIN_CATALOG: Record<string, CatalogEntry> = {
  // Plans
  price_1ThC4i9GJBS1rMz1aBG0g5ke: { kind: 'plan', mode: 'subscription', plan: 'pro', interval: 'monthly' },
  price_1ThC4i9GJBS1rMz1tWx74ybZ: { kind: 'plan', mode: 'subscription', plan: 'pro', interval: 'yearly' },
  price_1ThC4j9GJBS1rMz1MrcbbRQ9: { kind: 'plan', mode: 'subscription', plan: 'enterprise', interval: 'monthly' },
  price_1ThC4j9GJBS1rMz1gCFsqTyP: { kind: 'plan', mode: 'subscription', plan: 'enterprise', interval: 'yearly' },

  // Modules
  price_1ThC4k9GJBS1rMz1E0t69M1L: { kind: 'module', mode: 'subscription', module: 'returns_hub_starter' },
  price_1ThC4k9GJBS1rMz1A2LJAqEt: { kind: 'module', mode: 'subscription', module: 'returns_hub_professional' },
  price_1ThC4l9GJBS1rMz1y47ayzYM: { kind: 'module', mode: 'subscription', module: 'returns_hub_business' },
  price_1ThC4l9GJBS1rMz13Cq2v7ef: { kind: 'module', mode: 'subscription', module: 'supplier_portal' },
  price_1ThC4m9GJBS1rMz1fRnUxzg0: { kind: 'module', mode: 'subscription', module: 'customer_portal' },
  price_1ThC4m9GJBS1rMz1IInGn8M0: { kind: 'module', mode: 'subscription', module: 'custom_domain' },

  // Credit packs
  price_1ThC4n9GJBS1rMz11s9rYSRp: { kind: 'credits', mode: 'payment', pack: 'small', credits: 50 },
  price_1ThC4n9GJBS1rMz1UCruqASu: { kind: 'credits', mode: 'payment', pack: 'medium', credits: 200 },
  price_1ThC4o9GJBS1rMz125SKXxqb: { kind: 'credits', mode: 'payment', pack: 'large', credits: 500 },
};

export const PLAN_MONTHLY_CREDITS: Record<'free' | BillingPlanId, number> = {
  free: 3,
  pro: 25,
  enterprise: 100,
};

function isValidEntry(value: unknown): value is CatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.kind === 'plan') {
    return v.mode === 'subscription' && (v.plan === 'pro' || v.plan === 'enterprise')
      && (v.interval === 'monthly' || v.interval === 'yearly');
  }
  if (v.kind === 'module') {
    return v.mode === 'subscription' && typeof v.module === 'string' && /^[a-z_]{3,40}$/.test(v.module);
  }
  if (v.kind === 'credits') {
    return v.mode === 'payment' && typeof v.pack === 'string'
      && typeof v.credits === 'number' && Number.isInteger(v.credits) && v.credits > 0 && v.credits <= 10000;
  }
  return false;
}

let cachedCatalog: { key: string; catalog: Record<string, CatalogEntry> } | null = null;

export function getPriceCatalog(
  overrideJson: string | undefined = readEnv('STRIPE_PRICE_CATALOG_JSON'),
): Record<string, CatalogEntry> {
  const cacheKey = overrideJson ?? '';
  if (cachedCatalog && cachedCatalog.key === cacheKey) return cachedCatalog.catalog;
  const catalog: Record<string, CatalogEntry> = { ...BUILTIN_CATALOG };
  if (overrideJson) {
    try {
      const parsed = JSON.parse(overrideJson) as Record<string, unknown>;
      for (const [priceId, entry] of Object.entries(parsed)) {
        if (/^price_[A-Za-z0-9]+$/.test(priceId) && isValidEntry(entry)) {
          catalog[priceId] = entry;
        } else {
          console.warn('[stripe-catalog] ignoring invalid override entry', priceId);
        }
      }
    } catch (err) {
      console.error('[stripe-catalog] STRIPE_PRICE_CATALOG_JSON is not valid JSON:', err);
    }
  }
  cachedCatalog = { key: cacheKey, catalog };
  return catalog;
}

export function resolvePrice(priceId: string | null | undefined): CatalogEntry | null {
  if (!priceId || typeof priceId !== 'string') return null;
  return getPriceCatalog()[priceId] ?? null;
}

// ============================================
// Redirect URL allowlist (success_url / cancel_url)
// ============================================

const DEFAULT_ALLOWED_ORIGINS = [
  'https://trackbliss.eu',
  'https://www.trackbliss.eu',
  'https://trackbliss.com',
  'https://www.trackbliss.com',
  'https://dpp-app.fambliss.eu',
  'https://app-dpp.vercel.app',
];

/**
 * Local dev origins. Only accepted when ALLOW_LOCALHOST_REDIRECTS=true is set
 * as a secret (never in production), so a production checkout link can not
 * bounce to a page served on the payer's own machine.
 */
const LOCALHOST_ORIGINS = ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'];

/**
 * Exact-origin allowlist. There is deliberately NO wildcard for
 * *.vercel.app: any Vercel account can claim a project name such as
 * "app-dpp-evil" (or "app-dpp-x-<our-team-slug>") and receive that
 * subdomain. Preview deployments that must complete a checkout are added
 * explicitly via the APP_ALLOWED_ORIGINS secret (CSV of https origins).
 */
export function getAllowedRedirectOrigins(
  extraCsv: string | undefined = readEnv('APP_ALLOWED_ORIGINS'),
  allowLocalhost: boolean = readEnv('ALLOW_LOCALHOST_REDIRECTS') === 'true',
): string[] {
  const extra = (extraCsv || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, '').toLowerCase())
    .filter((s) =>
      /^https:\/\/[a-z0-9.-]+(:\d+)?$/.test(s) ||
      (allowLocalhost && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(s))
    );
  return [...DEFAULT_ALLOWED_ORIGINS, ...(allowLocalhost ? LOCALHOST_ORIGINS : []), ...extra];
}

/** True when `url` is an absolute URL whose origin is exactly on the allowlist. */
export function isAllowedRedirectUrl(url: unknown, allowedOrigins = getAllowedRedirectOrigins()): boolean {
  if (typeof url !== 'string' || url.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.username || parsed.password) return false;
  return allowedOrigins.includes(parsed.origin);
}

function readEnv(key: string): string | undefined {
  try {
    const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno;
    return deno?.env?.get?.(key) ?? undefined;
  } catch {
    return undefined;
  }
}
