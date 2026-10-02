/**
 * Public tenant lookup with an explicit outcome.
 *
 * `getPublicTenantBySlug()` in public-tenant.ts returns `null` both for an
 * unknown slug and for a failed request, so callers cannot tell "this portal
 * does not exist" from "the network hiccuped". Public portals must only show
 * a not-found page on a definite empty result; on an error they keep working
 * in a degraded (unbranded) mode instead.
 *
 * Like public-tenant.ts this only uses the SECURITY DEFINER RPCs from
 * migration 20261001b (anon has no column access to `tenants` beyond `id`).
 */
import { supabaseAnon } from '@/lib/supabase';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';
import type { PublicTenantInfo } from '@/services/supabase/public-tenant';
import type { TenantSettings } from '@/types/database';
import type { CustomerPortalBrandingOverrides, CustomerPortalSettings } from '@/types/returns-hub';

export type PublicTenantLookup =
  | { status: 'found'; tenant: PublicTenantInfo }
  | { status: 'not_found' }
  | { status: 'error' };

const SLUG_MAX_LEN = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PRIMARY_COLOR = '#3B82F6';

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

async function lookup(fn: string, args: Record<string, unknown>): Promise<PublicTenantLookup> {
  try {
    const { data, error } = await supabaseAnon.rpc(fn, args);
    if (error) {
      console.warn(`[public-tenant-lookup] ${fn} failed:`, error.message);
      return { status: 'error' };
    }
    const tenant = toInfo(data);
    return tenant ? { status: 'found', tenant } : { status: 'not_found' };
  } catch (err) {
    console.warn(`[public-tenant-lookup] ${fn} threw:`, err);
    return { status: 'error' };
  }
}

/** Resolve a portal slug. An empty or over-long slug is a definite not-found. */
export async function lookupPublicTenantBySlug(slug: string): Promise<PublicTenantLookup> {
  if (!slug || slug.length > SLUG_MAX_LEN) return { status: 'not_found' };
  return lookup('get_public_tenant_by_slug', { p_slug: slug });
}

/** Resolve a tenant id (e.g. the tenant of a tracked return). */
export async function lookupPublicTenantById(tenantId: string): Promise<PublicTenantLookup> {
  if (!tenantId || !UUID_RE.test(tenantId)) return { status: 'not_found' };
  return lookup('get_public_tenant_by_id', { p_tenant_id: tenantId });
}

/** Returns-portal header branding (same mapping as publicGetTenantBranding). */
export function getReturnsPortalBranding(tenant: PublicTenantInfo): {
  name: string;
  primaryColor: string;
  logoUrl: string;
} {
  const branding = tenant.settings.returnsHub?.branding;
  return {
    name: tenant.name,
    primaryColor: branding?.primaryColor || DEFAULT_PRIMARY_COLOR,
    logoUrl: branding?.logoUrl || '',
  };
}

/** Customer-portal branding (same merge as getCustomerPortalBranding). */
export function getCustomerPortalBrandingFromTenant(tenant: PublicTenantInfo): CustomerPortalBrandingOverrides {
  const rhBranding = tenant.settings.returnsHub?.branding;
  const portalSettings: CustomerPortalSettings = {
    ...DEFAULT_CUSTOMER_PORTAL_SETTINGS,
    ...(tenant.settings.returnsHub?.customerPortal as Partial<CustomerPortalSettings> | undefined),
  };
  const savedBranding = portalSettings.branding || {};
  const defaultBranding = DEFAULT_CUSTOMER_PORTAL_SETTINGS.branding;
  return {
    ...defaultBranding,
    ...savedBranding,
    ...(savedBranding.inheritFromReturnsHub && rhBranding
      ? {
          primaryColor: rhBranding.primaryColor || defaultBranding.primaryColor,
          logoUrl: rhBranding.logoUrl || defaultBranding.logoUrl,
        }
      : {}),
  };
}

/** Tenant-configured legal URLs (DPP design footer), if any. */
export function getTenantLegalUrls(tenant: PublicTenantInfo | null | undefined): {
  imprintUrl?: string;
  privacyUrl?: string;
} {
  const footer = tenant?.settings.dppDesign?.footer;
  return {
    imprintUrl: footer?.legalNoticeUrl?.trim() || undefined,
    privacyUrl: footer?.privacyPolicyUrl?.trim() || undefined,
  };
}
