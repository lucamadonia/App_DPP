/**
 * Admin Service Layer
 *
 * All cross-tenant admin operations route through the `admin-api` Edge Function.
 * This service provides typed wrappers for each admin operation.
 */

import { invokeEdgeFunction } from '@/lib/edge-function';
import { supabase } from '@/lib/supabase';
import type {
  PlatformStats,
  AdminTenant,
  AdminTenantDetail,
  AdminUser,
  AdminCoupon,
  CreateCouponInput,
  AdminApiRequest,
  AdminApiResponse,
} from '@/types/admin';
import type { BillingPlan, ModuleId } from '@/types/billing';
import type {
  AdminAuditEntry,
  AdminAuditFilter,
  TenantNote,
  FeatureFlag,
  TenantHealth,
  ImpersonationSession,
  ShopifyWebhookEntry,
  CohortCell,
  MrrWaterfallEntry,
  FeatureAdoption,
  TenantUsageTrend,
} from '@/types/admin-extended';

// ============================================
// EDGE FUNCTION CALLER
// ============================================

async function callAdminApi<T>(request: AdminApiRequest): Promise<T> {
  const { data, error } = await invokeEdgeFunction<AdminApiResponse<T>>(
    'admin-api',
    request as unknown as Record<string, unknown>,
  );

  if (error) {
    throw new Error(error.message || 'Admin API call failed');
  }

  if (!data.success) {
    throw new Error(data.error || 'Admin operation failed');
  }

  return data.data as T;
}

// ============================================
// PLATFORM STATS
// ============================================

export async function getPlatformStats(): Promise<PlatformStats> {
  return callAdminApi<PlatformStats>({
    operation: 'get_platform_stats',
  });
}

// ============================================
// TENANTS
// ============================================

export async function listAdminTenants(): Promise<AdminTenant[]> {
  return callAdminApi<AdminTenant[]>({
    operation: 'list_tenants',
  });
}

export async function getAdminTenant(tenantId: string): Promise<AdminTenantDetail> {
  return callAdminApi<AdminTenantDetail>({
    operation: 'get_tenant',
    params: { tenantId },
  });
}

export async function updateTenantPlan(
  tenantId: string,
  plan: BillingPlan
): Promise<void> {
  await callAdminApi({
    operation: 'update_tenant_plan',
    params: { tenantId, plan },
  });
}

export async function toggleModule(
  tenantId: string,
  moduleId: ModuleId,
  active: boolean
): Promise<void> {
  await callAdminApi({
    operation: 'toggle_module',
    params: { tenantId, moduleId, active },
  });
}

// ============================================
// USERS
// ============================================

export async function listAdminUsers(): Promise<AdminUser[]> {
  return callAdminApi<AdminUser[]>({
    operation: 'list_users',
  });
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<void> {
  await callAdminApi({
    operation: 'update_user_role',
    params: { userId, role },
  });
}

export async function toggleUserStatus(
  userId: string,
  active: boolean
): Promise<void> {
  await callAdminApi({
    operation: 'toggle_user_status',
    params: { userId, active },
  });
}

// ============================================
// CREDITS
// ============================================

export async function adjustCredits(
  tenantId: string,
  amount: number,
  reason: string
): Promise<void> {
  await callAdminApi({
    operation: 'adjust_credits',
    params: { tenantId, amount, reason },
  });
}

export async function setMonthlyAllowance(
  tenantId: string,
  allowance: number
): Promise<void> {
  await callAdminApi({
    operation: 'set_monthly_allowance',
    params: { tenantId, allowance },
  });
}

// ============================================
// COUPONS
// ============================================

export async function listCoupons(): Promise<AdminCoupon[]> {
  return callAdminApi<AdminCoupon[]>({
    operation: 'list_coupons',
  });
}

export async function createCoupon(input: CreateCouponInput): Promise<AdminCoupon> {
  return callAdminApi<AdminCoupon>({
    operation: 'create_coupon',
    params: input as unknown as Record<string, unknown>,
  });
}

export async function updateCoupon(
  couponId: string,
  active: boolean
): Promise<void> {
  await callAdminApi({
    operation: 'update_coupon',
    params: { couponId, active },
  });
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await callAdminApi({
    operation: 'delete_coupon',
    params: { couponId },
  });
}

// ============================================
// v2: TENANT STATUS (SUSPEND / REACTIVATE)
// ============================================

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  await callAdminApi({
    operation: 'suspend_tenant',
    params: { tenantId, reason },
  });
}

export async function reactivateTenant(tenantId: string, reason?: string): Promise<void> {
  await callAdminApi({
    operation: 'reactivate_tenant',
    params: { tenantId, reason: reason || null },
  });
}

export async function refreshTenantHealth(tenantId: string): Promise<TenantHealth> {
  return callAdminApi<TenantHealth>({
    operation: 'refresh_tenant_health',
    params: { tenantId },
  });
}

// ============================================
// v2: AUDIT LOG
// ============================================

export async function listAuditLog(filter: AdminAuditFilter = {}): Promise<{ entries: AdminAuditEntry[]; total: number }> {
  return callAdminApi<{ entries: AdminAuditEntry[]; total: number }>({
    operation: 'list_audit_log',
    params: filter as unknown as Record<string, unknown>,
  });
}

// ============================================
// v2: TENANT NOTES (admin-only, direct DB — RLS enforces super-admin)
// ============================================

export async function listTenantNotes(tenantId: string): Promise<TenantNote[]> {
  const { data, error } = await supabase
    .from('admin_tenant_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    authorId: r.author_id || undefined,
    authorEmail: r.author_email || undefined,
    content: r.content,
    pinned: !!r.pinned,
    tags: r.tags || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function addTenantNote(
  tenantId: string,
  content: string,
  opts: { pinned?: boolean; tags?: string[] } = {},
): Promise<TenantNote | null> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('admin_tenant_notes')
    .insert({
      tenant_id: tenantId,
      author_id: auth?.user?.id || null,
      author_email: auth?.user?.email || null,
      content: content.trim(),
      pinned: opts.pinned ?? false,
      tags: opts.tags || [],
    })
    .select()
    .single();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    tenantId: data.tenant_id,
    authorId: data.author_id || undefined,
    authorEmail: data.author_email || undefined,
    content: data.content,
    pinned: !!data.pinned,
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateTenantNote(
  noteId: string,
  patch: { content?: string; pinned?: boolean; tags?: string[] },
): Promise<void> {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.content != null) upd.content = patch.content.trim();
  if (patch.pinned != null) upd.pinned = patch.pinned;
  if (patch.tags != null) upd.tags = patch.tags;
  const { error } = await supabase.from('admin_tenant_notes').update(upd).eq('id', noteId);
  if (error) throw error;
}

export async function deleteTenantNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('admin_tenant_notes').delete().eq('id', noteId);
  if (error) throw error;
}

// ============================================
// v2: FEATURE FLAGS
// ============================================

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase.from('admin_feature_flags').select('*').order('key');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    key: r.key,
    description: r.description || undefined,
    enabledGlobally: !!r.enabled_globally,
    rolloutPercentage: Number(r.rollout_percentage) || 0,
    enabledForTenants: r.enabled_for_tenants || [],
    disabledForTenants: r.disabled_for_tenants || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertFeatureFlag(input: {
  key: string;
  description?: string;
  enabledGlobally?: boolean;
  rolloutPercentage?: number;
  enabledForTenants?: string[];
  disabledForTenants?: string[];
}): Promise<FeatureFlag> {
  return callAdminApi<FeatureFlag>({
    operation: 'upsert_feature_flag',
    params: input as unknown as Record<string, unknown>,
  });
}

export async function deleteFeatureFlag(key: string): Promise<void> {
  await callAdminApi({ operation: 'delete_feature_flag', params: { key } });
}

// ============================================
// v2: IMPERSONATION
// ============================================

export async function startImpersonation(tenantId: string, reason: string): Promise<ImpersonationSession> {
  return callAdminApi<ImpersonationSession>({
    operation: 'impersonate_start',
    params: { tenantId, reason },
  });
}

export async function endImpersonation(sessionId: string): Promise<void> {
  await callAdminApi({
    operation: 'impersonate_end',
    params: { sessionId },
  });
}

// ============================================
// v2: WEBHOOK DLQ
// ============================================

export async function listFailedWebhooks(opts: { tenantId?: string; limit?: number } = {}): Promise<ShopifyWebhookEntry[]> {
  return callAdminApi<ShopifyWebhookEntry[]>({
    operation: 'list_failed_webhooks',
    params: opts as unknown as Record<string, unknown>,
  });
}

export async function retryWebhook(webhookId: string): Promise<void> {
  await callAdminApi({
    operation: 'retry_webhook',
    params: { webhookId },
  });
}

// ============================================
// v2: USER MANAGEMENT EXTENDED
// ============================================

export async function resetUserPassword(userId: string): Promise<{ resetLink: string }> {
  return callAdminApi<{ resetLink: string }>({
    operation: 'reset_user_password',
    params: { userId },
  });
}

export async function toggleSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<void> {
  await callAdminApi({
    operation: 'toggle_super_admin',
    params: { userId, isSuperAdmin },
  });
}

// ============================================
// v2: REFUNDS
// ============================================

export async function issueRefund(
  tenantId: string,
  amountCents: number,
  reason: string,
  invoiceId?: string,
): Promise<void> {
  await callAdminApi({
    operation: 'issue_refund',
    params: { tenantId, amountCents, reason, invoiceId },
  });
}

// ============================================
// v2: ANALYTICS
// ============================================

export async function getTenantUsageTrend(tenantId: string, months = 12): Promise<TenantUsageTrend[]> {
  return callAdminApi<TenantUsageTrend[]>({
    operation: 'get_tenant_usage_trend',
    params: { tenantId, months },
  });
}

export async function getCohortRetention(monthsBack = 12): Promise<CohortCell[]> {
  return callAdminApi<CohortCell[]>({
    operation: 'get_cohort_retention',
    params: { monthsBack },
  });
}

export async function getMrrWaterfall(monthsBack = 12): Promise<MrrWaterfallEntry[]> {
  return callAdminApi<MrrWaterfallEntry[]>({
    operation: 'get_mrr_waterfall',
    params: { monthsBack },
  });
}

export async function getFeatureAdoption(): Promise<FeatureAdoption[]> {
  return callAdminApi<FeatureAdoption[]>({
    operation: 'get_feature_adoption',
  });
}

// ============================================
// v2: CROSS-TENANT TICKETS (SUPPORT)
// ============================================

export interface AdminTicketSummary {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  status: string;
  priority: string;
  customerEmail?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listAllTickets(opts: {
  status?: string[];
  priority?: string[];
  tenantId?: string;
  limit?: number;
} = {}): Promise<AdminTicketSummary[]> {
  return callAdminApi<AdminTicketSummary[]>({
    operation: 'list_all_tickets',
    params: opts as unknown as Record<string, unknown>,
  });
}

// ============================================
// PHASE 6: WHITELABELING
// ============================================

export interface SubdomainResult {
  subdomain: string | null;
  fullHost: string | null;
}

export interface CustomDomainResult {
  customDomain: string | null;
  verificationToken: string | null;
  verificationHost: string | null;
  instructions: string[];
}

export interface CustomDomainVerifyResult {
  verified: boolean;
  domain: string;
  error: string | null;
}

export interface TenantSmtpConfig {
  id?: string;
  tenantId: string;
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  fromAddress?: string;
  fromName?: string;
  useTls?: boolean;
  lastTestedAt?: string;
  lastTestResult?: string;
}

export async function setTenantSubdomain(tenantId: string, subdomain: string | null): Promise<SubdomainResult> {
  return callAdminApi<SubdomainResult>({
    operation: 'set_tenant_subdomain',
    params: { tenantId, subdomain },
  });
}

export async function setCustomDomain(tenantId: string, domain: string | null): Promise<CustomDomainResult> {
  return callAdminApi<CustomDomainResult>({
    operation: 'set_custom_domain',
    params: { tenantId, domain },
  });
}

export async function verifyCustomDomain(tenantId: string): Promise<CustomDomainVerifyResult> {
  return callAdminApi<CustomDomainVerifyResult>({
    operation: 'verify_custom_domain',
    params: { tenantId },
  });
}

export async function updateWhitelabelConfig(
  tenantId: string,
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return callAdminApi<Record<string, unknown>>({
    operation: 'update_whitelabel_config',
    params: { tenantId, config },
  });
}

export async function setTenantSmtp(input: {
  tenantId: string;
  enabled?: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
  useTls?: boolean;
}): Promise<TenantSmtpConfig> {
  return callAdminApi<TenantSmtpConfig>({
    operation: 'set_tenant_smtp',
    params: input as unknown as Record<string, unknown>,
  });
}

export async function testTenantSmtp(tenantId: string, testTo: string): Promise<{ ok: boolean; result: string }> {
  return callAdminApi<{ ok: boolean; result: string }>({
    operation: 'test_tenant_smtp',
    params: { tenantId, testTo },
  });
}

export async function disableTenantSmtp(tenantId: string): Promise<void> {
  await callAdminApi({ operation: 'disable_tenant_smtp', params: { tenantId } });
}

export async function getTenantWhitelabel(tenantId: string): Promise<{
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: string | null;
  dnsVerificationToken: string | null;
  whitelabelConfig: Record<string, unknown>;
  smtp: TenantSmtpConfig | null;
}> {
  const [tenantRes, smtpRes] = await Promise.all([
    supabase.from('tenants').select('subdomain, custom_domain, custom_domain_verified, custom_domain_verified_at, dns_verification_token, whitelabel_config').eq('id', tenantId).single(),
    supabase.from('tenant_smtp_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = tenantRes.data || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = smtpRes.data;
  return {
    subdomain: t.subdomain || null,
    customDomain: t.custom_domain || null,
    customDomainVerified: !!t.custom_domain_verified,
    customDomainVerifiedAt: t.custom_domain_verified_at || null,
    dnsVerificationToken: t.dns_verification_token || null,
    whitelabelConfig: t.whitelabel_config || {},
    smtp: s ? {
      id: s.id,
      tenantId: s.tenant_id,
      enabled: !!s.enabled,
      host: s.host || undefined,
      port: s.port || undefined,
      username: s.username || undefined,
      fromAddress: s.from_address || undefined,
      fromName: s.from_name || undefined,
      useTls: s.use_tls ?? true,
      lastTestedAt: s.last_tested_at || undefined,
      lastTestResult: s.last_test_result || undefined,
    } : null,
  };
}
