/**
 * Self-Service Whitelabeling für Tenant-Admins.
 * Nutzt direkte DB-Ops mit RLS / Helper-Functions (keine admin-api).
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';

export interface TenantWhitelabel {
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  whitelabelConfig: Record<string, unknown>;
  smtp: {
    id?: string;
    enabled: boolean;
    host?: string;
    port?: number;
    username?: string;
    fromAddress?: string;
    fromName?: string;
    useTls?: boolean;
    lastTestedAt?: string;
    lastTestResult?: string;
    passwordSet?: boolean;
  } | null;
}

export async function getOwnWhitelabel(): Promise<TenantWhitelabel> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const [tRes, sRes] = await Promise.all([
    supabase.from('tenants').select('subdomain, custom_domain, custom_domain_verified, whitelabel_config').eq('id', tenantId).single(),
    supabase.from('tenant_smtp_config_masked').select('*').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = tRes.data || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = sRes.data;
  return {
    subdomain: t.subdomain || null,
    customDomain: t.custom_domain || null,
    customDomainVerified: !!t.custom_domain_verified,
    whitelabelConfig: t.whitelabel_config || {},
    smtp: s ? {
      id: s.id,
      enabled: !!s.enabled,
      host: s.host || undefined,
      port: s.port || undefined,
      username: s.username || undefined,
      fromAddress: s.from_address || undefined,
      fromName: s.from_name || undefined,
      useTls: s.use_tls ?? true,
      lastTestedAt: s.last_tested_at || undefined,
      lastTestResult: s.last_test_result || undefined,
      passwordSet: !!s.password_hint,
    } : null,
  };
}

export async function setOwnSubdomain(subdomain: string | null): Promise<{ subdomain: string | null; fullHost: string | null }> {
  const { data, error } = await supabase.rpc('tenant_set_own_subdomain', { p_subdomain: subdomain });
  if (error) throw new Error(error.message);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subdomain: (data as any)?.subdomain ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fullHost: (data as any)?.full_host ?? null,
  };
}

export async function updateOwnWhitelabelConfig(patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('tenant_set_own_whitelabel_config', { p_patch: patch });
  if (error) throw new Error(error.message);
}

export async function setOwnSmtp(input: {
  enabled?: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
  useTls?: boolean;
}): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Check if existing row
  const { data: existing } = await supabase
    .from('tenant_smtp_config')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    enabled: input.enabled ?? true,
    host: input.host,
    port: input.port ?? 465,
    username: input.username,
    from_address: input.fromAddress,
    from_name: input.fromName,
    use_tls: input.useTls ?? true,
    updated_at: new Date().toISOString(),
  };
  if (input.password && input.password.length > 0) {
    payload.password_encrypted = input.password;
  }

  if (existing?.id) {
    const { error } = await supabase.from('tenant_smtp_config').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('tenant_smtp_config').insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function testOwnSmtp(testTo: string): Promise<{ ok: boolean; result: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { operation: 'test_tenant_smtp', params: { tenantId, testTo } },
  });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = data as any;
  if (!payload?.success) throw new Error(payload?.error || 'Test fehlgeschlagen');
  return payload.data as { ok: boolean; result: string };
}

// ============================================
// CUSTOM DOMAIN — Self-Service
// ============================================

export interface OwnCustomDomainResult {
  customDomain: string | null;
  verificationToken: string | null;
  verificationHost: string | null;
  instructions: string[];
  vercelStatus?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vercelVerification?: any;
}

export async function setOwnCustomDomain(domain: string | null): Promise<OwnCustomDomainResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { operation: 'set_custom_domain', params: { tenantId, domain } },
  });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = data as any;
  if (!payload?.success) throw new Error(payload?.error || 'Anlegen fehlgeschlagen');
  return payload.data as OwnCustomDomainResult;
}

export async function verifyOwnCustomDomain(): Promise<{ verified: boolean; domain: string; error: string | null }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { operation: 'verify_custom_domain', params: { tenantId } },
  });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = data as any;
  if (!payload?.success) throw new Error(payload?.error || 'Verifikation fehlgeschlagen');
  return payload.data;
}
