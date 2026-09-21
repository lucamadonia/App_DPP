/**
 * Etsy Open API v3 client helpers, shared by commerce-channel-oauth (health
 * probe + token refresh) and commerce-etsy-sync (receipt import).
 *
 * Two Etsy quirks drive the shape of this module:
 *
 *  1. Every v3 request needs `x-api-key: <keystring>:<shared secret>` on top of
 *     the bearer token.  The bare keystring has been rejected since 2026-02-09.
 *  2. Access tokens expire after an hour, so any call can come back 401 mid-run.
 *     `etsyFetch` therefore takes a token holder it can refresh and retry once,
 *     instead of leaving each caller to handle expiry itself.
 *
 * Rate limits on a Personal Access app are 5 req/s and 5 000 req/day.
 */

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptCredentials } from './commerce-crypto.ts';

const API = 'https://api.etsy.com/v3/application';
const TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

export interface EtsyCredentials {
  platform: 'etsy';
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: string | null;
  obtainedAt?: string;
}

function apiKeyHeader() {
  return `${Deno.env.get('ETSY_CLIENT_ID')}:${Deno.env.get('ETSY_CLIENT_SECRET')}`;
}

/**
 * Redeems the stored refresh token and persists the rotated pair.
 * Returns null when the grant itself is dead — the caller should then flip the
 * connection to reauth_required rather than retry.
 */
export async function refreshEtsyToken(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string,
  refreshToken?: string,
): Promise<EtsyCredentials | null> {
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  if (!clientId || !refreshToken) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken }),
  });
  if (!res.ok) return null;

  const tokens = await res.json();
  const payload: EtsyCredentials = {
    platform: 'etsy',
    accessToken: tokens.access_token,
    // Etsy may or may not rotate the refresh token; keep the old one if not.
    refreshToken: tokens.refresh_token || refreshToken,
    tokenType: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
    expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    obtainedAt: new Date().toISOString(),
  };

  await supabase.from('commerce_connection_credentials').upsert({
    connection_id: connectionId,
    tenant_id: tenantId,
    platform: 'etsy',
    encrypted_payload: await encryptCredentials(payload),
  });
  return payload;
}

export interface TokenHolder {
  creds: EtsyCredentials;
  supabase: SupabaseClient;
  connectionId: string;
  tenantId: string;
}

/** Thrown when the token is unusable and re-authorization is the only fix. */
export class EtsyReauthRequired extends Error {
  constructor(message = 'Etsy authorization is no longer valid') {
    super(message);
    this.name = 'EtsyReauthRequired';
  }
}

/**
 * GET an Etsy v3 path. Refreshes the access token once on 401 and retries;
 * mutates holder.creds so subsequent calls in the same run reuse the new token.
 */
export async function etsyFetch(holder: TokenHolder, path: string, query?: Record<string, string | number>) {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));

  const send = () =>
    fetch(url, {
      headers: { Authorization: `Bearer ${holder.creds.accessToken}`, 'x-api-key': apiKeyHeader() },
    });

  let res = await send();
  if (res.status === 401) {
    const refreshed = await refreshEtsyToken(
      holder.supabase, holder.connectionId, holder.tenantId, holder.creds.refreshToken,
    );
    if (!refreshed) throw new EtsyReauthRequired();
    holder.creds = refreshed;
    res = await send();
    if (res.status === 401) throw new EtsyReauthRequired();
  }
  if (!res.ok) throw new Error(`Etsy ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/**
 * Etsy money fields are documented as { amount, divisor, currency_code }, but
 * some payloads carry a plain number.  Accept both so a schema drift degrades
 * to a correct number rather than NaN in the dashboard.
 */
export function money(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value !== 'object' || !('amount' in value)) return 0;
  const amount = Number(value.amount);
  const divisor = Number('divisor' in value ? value.divisor : 1);
  if (!Number.isFinite(amount)) return 0;
  return Number.isFinite(divisor) && divisor > 0 ? amount / divisor : amount;
}

export function currencyOf(value: unknown, fallback = 'EUR'): string {
  return value && typeof value === 'object' && 'currency_code' in value && typeof value.currency_code === 'string' && value.currency_code ? value.currency_code : fallback;
}

/** Etsy timestamps are unix seconds under either `*_timestamp` spelling. */
export function tsToIso(seconds: unknown): string | null {
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : null;
}

/**
 * Resolves the seller's shop.  getMeUser returns shop_id on newer accounts;
 * older ones need the explicit shops lookup, so try both before giving up.
 */
export async function resolveShop(
  holder: TokenHolder,
): Promise<{ shopId: string; shopName?: string; currency?: string }> {
  const me = await etsyFetch(holder, '/users/me');
  if (me?.shop_id) {
    const shop = await etsyFetch(holder, `/shops/${me.shop_id}`).catch(() => null);
    return { shopId: String(me.shop_id), shopName: shop?.shop_name, currency: shop?.currency_code };
  }
  const userId = me?.user_id;
  if (!userId) throw new Error('Etsy /users/me returned no user_id');
  const shops = await etsyFetch(holder, `/users/${userId}/shops`);
  const shop = Array.isArray(shops?.results) ? shops.results[0] : shops;
  if (!shop?.shop_id) throw new Error('No Etsy shop found for this account');
  return { shopId: String(shop.shop_id), shopName: shop.shop_name, currency: shop.currency_code };
}
