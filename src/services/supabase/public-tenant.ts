/**
 * Public Tenant Service
 *
 * Public (anon) code must never read the `tenants` table directly: since
 * migration 20261001b anon has no column access beyond `id`, and
 * authenticated users only see their own tenant. Public pages resolve tenant
 * branding / portal configuration through SECURITY DEFINER RPCs that return
 * an allow-listed subset of `tenants.settings` (no credentials, no internal
 * config).
 */
import { supabaseAnon } from '@/lib/supabase';
import type { TenantSettings } from '@/types/database';

/** Allow-listed tenant fields returned by the get_public_tenant_* RPCs. */
export interface PublicTenantInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  /** Subset of TenantSettings: branding, qrCode, dppDesign, defaultLanguage,
   *  productLanguages, publicDomain, supplierPortal (public part),
   *  feedback { enabled, widget } and
   *  returnsHub { enabled, prefix, features, branding, embedAllowedDomains,
   *  customerPortal, notifications.emailLocale, portalDomain }. */
  settings: Partial<TenantSettings>;
}

const SLUG_MAX_LEN = 100;
const HOST_RE = /^[a-z0-9.-]{1,255}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toInfo(data: unknown): PublicTenantInfo | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Partial<PublicTenantInfo>;
  if (!row.id) return null;
  return {
    id: row.id,
    name: row.name || '',
    slug: row.slug || '',
    logo: row.logo ?? null,
    settings: (row.settings || {}) as Partial<TenantSettings>,
  };
}

async function callRpc(fn: string, args: Record<string, unknown>): Promise<PublicTenantInfo | null> {
  const { data, error } = await supabaseAnon.rpc(fn, args);
  if (error) {
    console.warn(`[public-tenant] ${fn} failed:`, error.message);
    return null;
  }
  return toInfo(data);
}

/** Public tenant info by tenant id (DPP pages, tracking, public tickets). */
export async function getPublicTenantById(tenantId: string): Promise<PublicTenantInfo | null> {
  if (!tenantId || !UUID_RE.test(tenantId)) return null;
  return callRpc('get_public_tenant_by_id', { p_tenant_id: tenantId });
}

/** Public tenant info by slug (returns portal, customer portal, embeds). */
export async function getPublicTenantBySlug(slug: string): Promise<PublicTenantInfo | null> {
  if (!slug || slug.length > SLUG_MAX_LEN) return null;
  return callRpc('get_public_tenant_by_slug', { p_slug: slug });
}

/** Public tenant info by verified custom portal domain. */
export async function getPublicTenantByDomain(hostname: string): Promise<PublicTenantInfo | null> {
  if (!hostname || !HOST_RE.test(hostname)) return null;
  return callRpc('get_public_tenant_by_domain', { p_domain: hostname.toLowerCase() });
}
