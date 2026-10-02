/**
 * Domain Resolution Service
 *
 * Resolves tenant by custom domain for white-label portal routing.
 */
import { supabase } from '@/lib/supabase';
import { getPublicTenantByDomain } from './public-tenant';

export interface DomainResolutionResult {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  portalType: 'returns' | 'customer' | 'both';
  primaryColor: string;
  logoUrl: string;
}

/**
 * Resolves a tenant by custom domain hostname.
 * Public/anon — goes through the get_public_tenant_by_domain RPC, which only
 * matches verified domains and returns allow-listed branding fields.
 */
export async function resolveTenantByDomain(
  hostname: string
): Promise<DomainResolutionResult | null> {
  // Input validation: hostnames only contain letters, digits, dots and
  // hyphens (max 255 chars per RFC 1035). Anything else is rejected before
  // it reaches the database.
  if (!hostname || !/^[a-z0-9.-]{1,255}$/i.test(hostname)) return null;

  const data = await getPublicTenantByDomain(hostname);
  if (!data) return null;

  const rh = data.settings?.returnsHub;
  const portalDomain = rh?.portalDomain;
  if (!portalDomain) return null;

  const branding: { primaryColor?: string; logoUrl?: string } = rh?.branding || {};
  const portalBranding: { inheritFromReturnsHub?: boolean; primaryColor?: string; logoUrl?: string } =
    rh?.customerPortal?.branding || {};

  return {
    tenantId: data.id,
    tenantSlug: data.slug,
    tenantName: data.name,
    portalType: portalDomain.portalType,
    primaryColor:
      portalBranding.inheritFromReturnsHub !== false
        ? branding.primaryColor || '#3B82F6'
        : portalBranding.primaryColor || '#3B82F6',
    logoUrl:
      portalBranding.inheritFromReturnsHub !== false
        ? branding.logoUrl || ''
        : portalBranding.logoUrl || '',
  };
}

/**
 * Checks if a domain is available (not already used by another tenant).
 * Runs server-side (is_portal_domain_available RPC) because tenants can no
 * longer read other tenants' settings. The caller's own tenant is always
 * excluded; `_excludeTenantId` is kept for API compatibility.
 */
export async function isDomainAvailable(
  domain: string,
  _excludeTenantId?: string
): Promise<boolean> {
  if (!domain || !/^[a-z0-9.-]{1,255}$/i.test(domain)) return false;
  const { data, error } = await supabase.rpc('is_portal_domain_available', {
    p_domain: domain.toLowerCase(),
  });
  if (error) {
    console.error('Domain availability check failed:', error.message);
    return false;
  }
  return data === true;
}
