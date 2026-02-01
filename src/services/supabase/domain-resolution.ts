/**
 * Domain Resolution Service
 *
 * Resolves tenant by custom domain for white-label portal routing.
 */
import { supabase } from '@/lib/supabase';

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
 * Public/anon query — no auth required.
 */
export async function resolveTenantByDomain(
  hostname: string
): Promise<DomainResolutionResult | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, settings')
    .filter(
      'settings->returnsHub->portalDomain->>customDomain',
      'eq',
      hostname
    )
    .filter(
      'settings->returnsHub->portalDomain->>domainStatus',
      'eq',
      'verified'
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const rh = data.settings?.returnsHub;
  const portalDomain = rh?.portalDomain;
  if (!portalDomain) return null;

  const branding = rh?.branding || {};
  const portalBranding = rh?.customerPortal?.branding || {};

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
 */
export async function isDomainAvailable(
  domain: string,
  excludeTenantId?: string
): Promise<boolean> {
  let query = supabase
    .from('tenants')
    .select('id')
    .filter(
      'settings->returnsHub->portalDomain->>customDomain',
      'eq',
      domain
    )
    .limit(1);

  if (excludeTenantId) {
    query = query.neq('id', excludeTenantId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}
