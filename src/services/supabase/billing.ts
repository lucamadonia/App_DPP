/**
 * Billing Service
 *
 * Core service for the Trackbliss billing system.
 * Handles entitlements, quotas, credits, and Stripe integration.
 *
 * All functions are modular and independently testable.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import {
  PLAN_CONFIGS,
  MODULE_CONFIGS,
  RETURNS_HUB_MODULES,
  WAREHOUSE_MODULES,
  type BillingPlan,
  type ModuleId,
  type TenantEntitlements,
  type CreditBalance,
  type QuotaCheckResult,
  type UsageResourceType,
  type BillingSubscription,
  type BillingInvoice,
  type CreditTransaction,
  type ModuleLimits,
} from '@/types/billing';

// ============================================
// ENTITLEMENT CACHE
// ============================================

let entitlementCache: { data: TenantEntitlements; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function invalidateEntitlementCache(): void {
  entitlementCache = null;
}

// ============================================
// CORE: GET TENANT ENTITLEMENTS
// ============================================

/**
 * Load the full entitlements for the current tenant.
 * Combines plan config + active modules + credit balance.
 * Cached for 2 minutes.
 */
export async function getTenantEntitlements(
  tenantId?: string,
  forceRefresh = false,
): Promise<TenantEntitlements> {
  // Check cache
  if (!forceRefresh && entitlementCache && Date.now() - entitlementCache.timestamp < CACHE_TTL) {
    return entitlementCache.data;
  }

  const tid = tenantId || await getCurrentTenantId();
  if (!tid) throw new Error('No tenant ID available');

  // Fetch all billing data in parallel
  const [subscriptionRes, modulesRes, creditsRes] = await Promise.all([
    supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('tenant_id', tid)
      .single(),
    supabase
      .from('billing_module_subscriptions')
      .select('*')
      .eq('tenant_id', tid)
      .eq('status', 'active'),
    supabase
      .from('billing_credits')
      .select('*')
      .eq('tenant_id', tid)
      .single(),
  ]);

  // Subscription (fallback to free)
  const sub = subscriptionRes.data;
  const plan: BillingPlan = sub?.plan || 'free';
  const status = sub?.status || 'active';
  const planConfig = PLAN_CONFIGS[plan];

  // Active modules
  const activeModules = new Set<ModuleId>(
    (modulesRes.data || []).map((m: { module_id: ModuleId }) => m.module_id)
  );

  // Credits (fallback to free defaults)
  const credits = creditsRes.data;
  const monthlyRemaining = Math.max(0, (credits?.monthly_allowance || planConfig.limits.monthlyAICredits) - (credits?.monthly_used || 0));
  const purchasedBalance = credits?.purchased_balance || 0;

  const creditBalance: CreditBalance = {
    monthlyAllowance: credits?.monthly_allowance || planConfig.limits.monthlyAICredits,
    monthlyUsed: credits?.monthly_used || 0,
    monthlyResetAt: credits?.monthly_reset_at || null,
    purchasedBalance,
    totalAvailable: monthlyRemaining + purchasedBalance,
  };

  // Compute module limits (from highest active returns hub tier)
  let moduleLimits: Partial<ModuleLimits> = {};
  for (let i = RETURNS_HUB_MODULES.length - 1; i >= 0; i--) {
    const rhModule = RETURNS_HUB_MODULES[i];
    if (activeModules.has(rhModule)) {
      moduleLimits = { ...moduleLimits, ...MODULE_CONFIGS[rhModule].limits };
      break;
    }
  }

  // Merge warehouse module limits (from highest active warehouse tier)
  for (let i = WAREHOUSE_MODULES.length - 1; i >= 0; i--) {
    const whModule = WAREHOUSE_MODULES[i];
    if (activeModules.has(whModule)) {
      moduleLimits = { ...moduleLimits, ...MODULE_CONFIGS[whModule].limits };
      break;
    }
  }

  const subscription: BillingSubscription | null = sub ? transformSubscription(sub) : null;

  const entitlements: TenantEntitlements = {
    plan,
    status,
    modules: activeModules,
    limits: {
      ...planConfig.limits,
      ...moduleLimits,
    },
    credits: creditBalance,
    features: planConfig.features,
    subscription,
    cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
    currentPeriodEnd: sub?.current_period_end || null,
  };

  // Cache
  entitlementCache = { data: entitlements, timestamp: Date.now() };
  return entitlements;
}

// ============================================
// QUOTA CHECKS
// ============================================

/**
 * Check if a resource creation is within quota limits.
 * Returns { allowed, current, limit } for UI display.
 */
export async function checkQuota(
  resource: UsageResourceType,
  extra?: { productId?: string; tenantId?: string },
): Promise<QuotaCheckResult> {
  const tid = extra?.tenantId || await getCurrentTenantId();
  if (!tid) return { allowed: false, current: 0, limit: 0, resource };

  const entitlements = await getTenantEntitlements(tid);
  const { limits } = entitlements;

  let current = 0;
  let limit = 0;

  switch (resource) {
    case 'product': {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid);
      current = count || 0;
      limit = limits.maxProducts;
      break;
    }
    case 'batch': {
      if (extra?.productId) {
        const { count } = await supabase
          .from('product_batches')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', extra.productId);
        current = count || 0;
      }
      limit = limits.maxBatchesPerProduct;
      break;
    }
    case 'document': {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid);
      current = count || 0;
      limit = limits.maxDocuments;
      break;
    }
    case 'admin_user': {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid);
      current = count || 0;
      limit = limits.maxAdminUsers;
      break;
    }
    case 'supply_chain_entry': {
      if (extra?.productId) {
        const { count } = await supabase
          .from('supply_chain_entries')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', extra.productId);
        current = count || 0;
      }
      limit = limits.maxSupplyChainPerProduct;
      break;
    }
    case 'return': {
      // Count returns created this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('rh_returns')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .gte('created_at', monthStart.toISOString());
      current = count || 0;
      limit = limits.maxReturnsPerMonth || 0;
      break;
    }
    case 'workflow_rule': {
      const { count } = await supabase
        .from('rh_workflow_rules')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .eq('active', true);
      current = count || 0;
      limit = limits.maxWorkflowRules || 0;
      break;
    }
    case 'warehouse_location': {
      const { count } = await supabase
        .from('wh_locations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .eq('is_active', true);
      current = count || 0;
      limit = limits.maxWarehouseLocations || 0;
      break;
    }
    case 'shipment': {
      // Count shipments created this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('wh_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .gte('created_at', monthStart.toISOString());
      current = count || 0;
      limit = limits.maxShipmentsPerMonth || 0;
      break;
    }
    case 'stock_transaction': {
      // Count stock transactions this month
      const monthStart2 = new Date();
      monthStart2.setDate(1);
      monthStart2.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('wh_stock_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid)
        .gte('created_at', monthStart2.toISOString());
      current = count || 0;
      limit = limits.maxStockTransactionsPerMonth || 0;
      break;
    }
    default:
      limit = Infinity;
  }

  return {
    allowed: current < limit,
    current,
    limit,
    resource,
  };
}

// ============================================
// MODULE CHECKS
// ============================================

/**
 * Check if a specific module is active for the current tenant.
 */
export async function hasModule(
  moduleId: ModuleId,
  tenantId?: string,
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.modules.has(moduleId);
}

/**
 * Check if any returns hub module is active.
 */
export async function hasAnyReturnsHubModule(tenantId?: string): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return RETURNS_HUB_MODULES.some(m => entitlements.modules.has(m));
}

/**
 * Check if any warehouse module is active.
 */
export async function hasAnyWarehouseModule(tenantId?: string): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return WAREHOUSE_MODULES.some(m => entitlements.modules.has(m));
}

/**
 * Check if a feature flag is enabled for the current plan.
 */
export async function canUseFeature(
  feature: keyof TenantEntitlements['features'],
  tenantId?: string,
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.features[feature];
}

// ============================================
// CREDIT SYSTEM
// ============================================

/**
 * Get the current credit balance for the tenant.
 */
export async function getCreditBalance(tenantId?: string): Promise<CreditBalance> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.credits;
}

/**
 * Consume credits for an AI operation.
 * Deducts from monthly first, then purchased.
 * Returns success status and remaining balance.
 */
export async function consumeCredits(
  amount: number,
  operation: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; remaining: number }> {
  const tid = await getCurrentTenantId();
  if (!tid) return { success: false, remaining: 0 };

  // Get fresh credit data (bypass cache)
  const { data: credits } = await supabase
    .from('billing_credits')
    .select('*')
    .eq('tenant_id', tid)
    .single();

  if (!credits) return { success: false, remaining: 0 };

  const monthlyRemaining = Math.max(0, credits.monthly_allowance - credits.monthly_used);
  const totalAvailable = monthlyRemaining + credits.purchased_balance;

  if (totalAvailable < amount) {
    return { success: false, remaining: totalAvailable };
  }

  // Determine how much from each source
  let fromMonthly = Math.min(amount, monthlyRemaining);
  let fromPurchased = amount - fromMonthly;

  // Update credits atomically
  const { error } = await supabase
    .from('billing_credits')
    .update({
      monthly_used: credits.monthly_used + fromMonthly,
      purchased_balance: credits.purchased_balance - fromPurchased,
      total_consumed: credits.total_consumed + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tid);

  if (error) {
    console.error('Failed to consume credits:', error);
    return { success: false, remaining: totalAvailable };
  }

  // Log transaction(s)
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  const newTotal = totalAvailable - amount;

  const transactions = [];
  if (fromMonthly > 0) {
    transactions.push({
      tenant_id: tid,
      type: 'consume',
      amount: -fromMonthly,
      balance_after: newTotal,
      source: 'monthly',
      description: operation,
      metadata: metadata || {},
      user_id: userId,
    });
  }
  if (fromPurchased > 0) {
    transactions.push({
      tenant_id: tid,
      type: 'consume',
      amount: -fromPurchased,
      balance_after: newTotal,
      source: 'purchased',
      description: operation,
      metadata: metadata || {},
      user_id: userId,
    });
  }

  if (transactions.length > 0) {
    await supabase.from('billing_credit_transactions').insert(transactions);
  }

  // Invalidate cache
  invalidateEntitlementCache();

  return { success: true, remaining: newTotal };
}

/**
 * Refund credits (e.g., on failed AI call).
 * Credits go back to monthly first (if there was monthly usage), then purchased.
 */
export async function refundCredits(
  amount: number,
  operation: string,
): Promise<void> {
  const tid = await getCurrentTenantId();
  if (!tid) return;

  const { data: credits } = await supabase
    .from('billing_credits')
    .select('*')
    .eq('tenant_id', tid)
    .single();

  if (!credits) return;

  // Refund to monthly first
  const monthlyRefund = Math.min(amount, credits.monthly_used);
  const purchasedRefund = amount - monthlyRefund;

  await supabase
    .from('billing_credits')
    .update({
      monthly_used: credits.monthly_used - monthlyRefund,
      purchased_balance: credits.purchased_balance + purchasedRefund,
      total_consumed: Math.max(0, credits.total_consumed - amount),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tid);

  // Log refund
  const { data: userData } = await supabase.auth.getUser();
  const totalAfter = (credits.monthly_allowance - credits.monthly_used + monthlyRefund) + credits.purchased_balance + purchasedRefund;

  await supabase.from('billing_credit_transactions').insert({
    tenant_id: tid,
    type: 'refund',
    amount,
    balance_after: totalAfter,
    source: 'monthly',
    description: `Refund: ${operation}`,
    user_id: userData?.user?.id,
  });

  invalidateEntitlementCache();
}

// ============================================
// DATA FETCHERS (for Billing UI)
// ============================================

/**
 * Get credit transaction history.
 */
export async function getCreditTransactions(
  limit = 50,
  offset = 0,
): Promise<CreditTransaction[]> {
  const tid = await getCurrentTenantId();
  if (!tid) return [];

  const { data } = await supabase
    .from('billing_credit_transactions')
    .select('*')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return (data || []).map(transformCreditTransaction);
}

/**
 * Get invoice history.
 */
export async function getInvoices(): Promise<BillingInvoice[]> {
  const tid = await getCurrentTenantId();
  if (!tid) return [];

  const { data } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false });

  return (data || []).map(transformInvoice);
}

/**
 * Get current usage counts for all resources.
 */
export async function getUsageSummary(): Promise<Record<string, { current: number; limit: number }>> {
  const tid = await getCurrentTenantId();
  if (!tid) return {};

  const entitlements = await getTenantEntitlements(tid);
  const { limits } = entitlements;

  // Parallel count queries
  const [products, documents, adminUsers] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tid),
  ]);

  return {
    products: { current: products.count || 0, limit: limits.maxProducts },
    documents: { current: documents.count || 0, limit: limits.maxDocuments },
    adminUsers: { current: adminUsers.count || 0, limit: limits.maxAdminUsers },
  };
}

// ============================================
// STRIPE CHECKOUT HELPERS
// ============================================

/**
 * Create a Stripe Checkout session via Edge Function.
 * Returns { url } on success or { error } with detail message on failure.
 */
export async function createCheckoutSession(params: {
  priceId: string;
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  locale?: string;
}): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: params,
  });

  if (error) {
    console.error('Checkout session error:', error);
    // Extract real error from edge function response body
    const detail = extractEdgeFunctionError(error);
    return { error: detail };
  }

  if (!data?.url) {
    console.error('Checkout session returned no URL:', data);
    return { error: data?.error || 'No checkout URL returned' };
  }

  return { url: data.url };
}

/**
 * Create a Stripe Customer Portal session via Edge Function.
 * Returns { url } on success or { error } with detail message on failure.
 */
export async function createPortalSession(
  returnUrl: string,
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { returnUrl },
  });

  if (error) {
    console.error('Portal session error:', error);
    const detail = extractEdgeFunctionError(error);
    return { error: detail };
  }

  if (!data?.url) {
    return { error: data?.error || 'No portal URL returned' };
  }

  return { url: data.url };
}

// ============================================
// EDGE FUNCTION ERROR EXTRACTION
// ============================================

/**
 * Extract the real error message from a Supabase Edge Function error.
 * When an edge function returns non-2xx, supabase-js wraps the response
 * in error.context (which contains the JSON body with the real error).
 */
function extractEdgeFunctionError(error: { message?: string; context?: unknown }): string {
  try {
    // error.context may be the parsed JSON body or a string
    const ctx = error.context;
    if (ctx && typeof ctx === 'object') {
      // Direct object — e.g. { error: "Stripe Tax not enabled..." }
      const obj = ctx as Record<string, unknown>;
      if (typeof obj.error === 'string') return obj.error;
      // Sometimes nested in body
      if (obj.body && typeof obj.body === 'object') {
        const body = obj.body as Record<string, unknown>;
        if (typeof body.error === 'string') return body.error;
      }
    }
    if (typeof ctx === 'string') {
      try {
        const parsed = JSON.parse(ctx);
        if (typeof parsed.error === 'string') return parsed.error;
      } catch {
        // ctx is a plain string error
        if (ctx.length > 0 && ctx.length < 500) return ctx;
      }
    }
  } catch {
    // fallthrough
  }
  return error.message || 'Unknown error';
}

// ============================================
// TRANSFORM FUNCTIONS (snake_case → camelCase)
// ============================================

function transformSubscription(row: Record<string, unknown>): BillingSubscription {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    stripeCustomerId: row.stripe_customer_id as string,
    stripeSubscriptionId: row.stripe_subscription_id as string | null,
    plan: row.plan as BillingPlan,
    status: row.status as BillingSubscription['status'],
    currentPeriodStart: row.current_period_start as string | null,
    currentPeriodEnd: row.current_period_end as string | null,
    cancelAtPeriodEnd: row.cancel_at_period_end as boolean,
    trialEnd: row.trial_end as string | null,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformCreditTransaction(row: Record<string, unknown>): CreditTransaction {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    type: row.type as CreditTransaction['type'],
    amount: row.amount as number,
    balanceAfter: row.balance_after as number,
    source: row.source as CreditTransaction['source'],
    description: row.description as string | null,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    userId: row.user_id as string | null,
    createdAt: row.created_at as string,
  };
}

function transformInvoice(row: Record<string, unknown>): BillingInvoice {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    stripeInvoiceId: row.stripe_invoice_id as string,
    stripeInvoiceUrl: row.stripe_invoice_url as string | null,
    stripePdfUrl: row.stripe_pdf_url as string | null,
    amountDue: row.amount_due as number,
    amountPaid: row.amount_paid as number,
    currency: row.currency as string,
    status: row.status as BillingInvoice['status'],
    periodStart: row.period_start as string | null,
    periodEnd: row.period_end as string | null,
    createdAt: row.created_at as string,
  };
}
