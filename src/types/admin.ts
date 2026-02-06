/**
 * Admin Portal Types
 *
 * Types for the super-admin dashboard: cross-tenant management,
 * billing administration, coupon management, and platform statistics.
 */

import type { BillingPlan, ModuleId } from './billing';

// ============================================
// PLATFORM STATISTICS
// ============================================

export interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalProducts: number;
  activeReturns: number;
  paidTenants: number;
  mrr: number;
  recentSignups7d: number;
  aiCreditsUsedMonth: number;
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

// ============================================
// TENANT ADMIN VIEW
// ============================================

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  country: string | null;
  eori: string | null;
  vat: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  // Billing summary (joined)
  plan: BillingPlan;
  activeModules: ModuleId[];
  userCount: number;
  productCount: number;
  // Credits
  monthlyAllowance: number;
  monthlyUsed: number;
  purchasedBalance: number;
}

export interface AdminTenantDetail extends AdminTenant {
  settings: Record<string, unknown>;
  users: AdminUser[];
  creditTransactions: AdminCreditTransaction[];
  invoices: AdminInvoice[];
  usage: AdminUsageSummary;
}

// ============================================
// USER ADMIN VIEW
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  tenantId: string;
  tenantName: string;
  isSuperAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

// ============================================
// CREDIT MANAGEMENT
// ============================================

export interface AdminCreditTransaction {
  id: string;
  tenantId: string;
  type: 'consume' | 'purchase' | 'refund' | 'monthly_reset' | 'admin_adjust';
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
}

export interface AdminCreditSummary {
  tenantId: string;
  tenantName: string;
  plan: BillingPlan;
  monthlyAllowance: number;
  monthlyUsed: number;
  purchasedBalance: number;
  totalAvailable: number;
}

// ============================================
// COUPONS (Stripe)
// ============================================

export interface AdminCoupon {
  id: string;
  name: string;
  promoCode: string | null;
  promoCodeId: string | null;
  amountOff: number | null;
  percentOff: number | null;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateCouponInput {
  name: string;
  discountType: 'percent' | 'amount';
  discountValue: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  promoCode?: string;
  maxRedemptions?: number;
  expiresAt?: string;
}

// ============================================
// INVOICES
// ============================================

export interface AdminInvoice {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  invoicePdfUrl: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

// ============================================
// USAGE SUMMARY
// ============================================

export interface AdminUsageSummary {
  products: number;
  documents: number;
  adminUsers: number;
  returns: number;
  tickets: number;
  suppliers: number;
  storageMb: number;
}

// ============================================
// ADMIN API OPERATIONS
// ============================================

export type AdminOperation =
  | 'get_platform_stats'
  | 'list_tenants'
  | 'get_tenant'
  | 'update_tenant_plan'
  | 'toggle_module'
  | 'list_users'
  | 'update_user_role'
  | 'toggle_user_status'
  | 'adjust_credits'
  | 'set_monthly_allowance'
  | 'list_coupons'
  | 'create_coupon'
  | 'update_coupon'
  | 'delete_coupon';

export interface AdminApiRequest {
  operation: AdminOperation;
  params?: Record<string, unknown>;
}

export interface AdminApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
