/**
 * Admin Service Layer
 *
 * All cross-tenant admin operations route through the `admin-api` Edge Function.
 * This service provides typed wrappers for each admin operation.
 */

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

// ============================================
// EDGE FUNCTION CALLER
// ============================================

async function callAdminApi<T>(request: AdminApiRequest): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Admin API call failed');
  }

  const response = data as AdminApiResponse<T>;
  if (!response.success) {
    throw new Error(response.error || 'Admin operation failed');
  }

  return response.data as T;
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
