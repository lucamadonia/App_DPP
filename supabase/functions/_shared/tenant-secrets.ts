/**
 * Tenant integration credentials (DHL, INTERNETMARKE/Portokasse, Shopify).
 *
 * Since migration 20261001b the credentials live in `public.tenant_secrets`
 * (service role only) instead of the tenant-readable `tenants.settings` JSONB.
 * A trigger on `tenants` strips any credential that is written into settings,
 * so edge functions must read AND write secrets through this module, always
 * with a service-role client.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type TenantSecretProvider = 'dhl' | 'internetmarke' | 'shopify';

export interface DHLSecrets { apiKey?: string; username?: string; password?: string }
export interface InternetmarkeSecrets {
  clientId?: string;
  clientSecret?: string;
  portokasseUsername?: string;
  portokassePassword?: string;
}
export interface ShopifySecrets { accessToken?: string }

const ALLOWED_KEYS: Record<TenantSecretProvider, string[]> = {
  dhl: ['apiKey', 'username', 'password'],
  internetmarke: ['clientId', 'clientSecret', 'portokasseUsername', 'portokassePassword'],
  shopify: ['accessToken'],
};

/** Read one provider's secrets for a tenant. Returns {} when none stored. */
export async function getTenantSecrets<T = Record<string, string>>(supabase: SupabaseClient, tenantId: string, provider: TenantSecretProvider): Promise<T> {
  const { data, error } = await supabase
    .from('tenant_secrets')
    .select('secrets')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) {
    console.error(`[tenant-secrets] read ${provider} failed:`, error.message);
    return {} as T;
  }
  return ((data?.secrets as T) || ({} as T));
}

/**
 * Merge new secret values for a provider. Only allow-listed keys with a
 * non-empty string value are written, so a partial form save never wipes a
 * stored secret. Returns an error message or null.
 */
export async function mergeTenantSecrets(supabase: SupabaseClient, tenantId: string, provider: TenantSecretProvider, values: Record<string, unknown>): Promise<string | null> {
  const patch: Record<string, string> = {};
  for (const key of ALLOWED_KEYS[provider]) {
    const v = values[key];
    if (typeof v === 'string' && v.trim() !== '') patch[key] = v.trim();
  }
  if (Object.keys(patch).length === 0) return null;

  const current = await getTenantSecrets<Record<string, string>>(supabase, tenantId, provider);
  const { error } = await supabase
    .from('tenant_secrets')
    .upsert(
      { tenant_id: tenantId, provider, secrets: { ...current, ...patch }, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,provider' },
    );
  if (error) {
    console.error(`[tenant-secrets] write ${provider} failed:`, error.message);
    return 'Failed to store credentials';
  }
  return null;
}

/** Tenant IDs that have stored secrets for a provider (cron fan-out). */
export async function tenantIdsWithSecrets(supabase: SupabaseClient, provider: TenantSecretProvider, requiredKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tenant_secrets')
    .select('tenant_id, secrets')
    .eq('provider', provider);
  if (error) {
    console.error(`[tenant-secrets] list ${provider} failed:`, error.message);
    return [];
  }
  return (data || [])
    .filter((r: { secrets?: Record<string, unknown> }) => typeof r.secrets?.[requiredKey] === 'string' && r.secrets[requiredKey] !== '')
    .map((r: { tenant_id: string }) => r.tenant_id);
}

/**
 * True when the bearer token is the project's service-role key. Accepts an
 * exact match with SUPABASE_SERVICE_ROLE_KEY, or a JWT that PostgREST itself
 * accepts as service_role (proven by reading tenant_secrets, which anon and
 * authenticated have no grant on). Never trusts an unverified role claim.
 */
export async function isServiceRoleBearer(authHeader: string | null, supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  if (!authHeader || !supabaseUrl) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (serviceRoleKey && token === serviceRoleKey) return true;

  // Cheap pre-filter: only JWTs claiming service_role are worth a round trip.
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const claim = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    if (claim?.role !== 'service_role') return false;
  } catch {
    return false;
  }

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/tenant_secrets?select=tenant_id&limit=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
    });
    await resp.body?.cancel();
    return resp.ok;
  } catch {
    return false;
  }
}
