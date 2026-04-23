import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminApiRequest {
  operation: string;
  params?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: Extract JWT and verify super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client (for auth verification)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    // Admin client (service role, bypasses RLS)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check is_super_admin + granular admin_role (with self-service bypass)
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin, admin_role, tenant_id, role')
      .eq('id', user.id)
      .single();

    // Parse request
    const body: AdminApiRequest = await req.json();
    const { operation, params = {} } = body;

    // Self-service operations that tenant admins can call for their own tenant
    const SELF_SERVICE_OPS = new Set(['test_tenant_smtp']);
    const isSuperAdmin = !!profile?.is_super_admin || profile?.admin_role === 'super_admin';
    const isSelfServiceOp = SELF_SERVICE_OPS.has(operation);
    const selfServiceAllowed = isSelfServiceOp
      && profile?.role === 'admin'
      && params.tenantId === profile?.tenant_id;

    // Granular role check via SQL helper
    let granularAllowed = false;
    if (!isSuperAdmin && !selfServiceAllowed && profile?.admin_role) {
      const { data: allowed } = await admin.rpc('admin_role_allows', {
        p_role: profile.admin_role,
        p_op: operation,
      });
      granularAllowed = !!allowed;
    }

    if (!isSuperAdmin && !selfServiceAllowed && !granularAllowed) {
      return jsonResponse({ success: false, error: `Forbidden: operation ${operation} not permitted for role ${profile?.admin_role || 'none'}` }, 403);
    }

    // Audit context (used by write operations)
    const auditCtx: AuditContext = {
      adminId: user.id,
      adminEmail: user.email || '',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
    };

    // Route operations
    switch (operation) {
      case 'get_platform_stats':
        return jsonResponse({ success: true, data: await getPlatformStats(admin) });

      case 'list_tenants':
        return jsonResponse({ success: true, data: await listTenants(admin) });

      case 'get_tenant':
        return jsonResponse({ success: true, data: await getTenant(admin, params.tenantId as string) });

      case 'update_tenant_plan':
        await updateTenantPlan(admin, params.tenantId as string, params.plan as string);
        return jsonResponse({ success: true });

      case 'toggle_module':
        await toggleModule(admin, params.tenantId as string, params.moduleId as string, params.active as boolean);
        return jsonResponse({ success: true });

      case 'list_users':
        return jsonResponse({ success: true, data: await listUsers(admin) });

      case 'update_user_role':
        await updateUserRole(admin, params.userId as string, params.role as string);
        return jsonResponse({ success: true });

      case 'toggle_user_status':
        await toggleUserStatus(admin, params.userId as string, params.active as boolean);
        return jsonResponse({ success: true });

      case 'adjust_credits':
        await adjustCredits(admin, params.tenantId as string, params.amount as number, params.reason as string);
        return jsonResponse({ success: true });

      case 'set_monthly_allowance':
        await setMonthlyAllowance(admin, params.tenantId as string, params.allowance as number);
        return jsonResponse({ success: true });

      case 'list_coupons':
        return jsonResponse({ success: true, data: await listCoupons() });

      case 'create_coupon':
        return jsonResponse({ success: true, data: await createCoupon(params) });

      case 'update_coupon':
        await updateCouponStatus(params.couponId as string, params.active as boolean);
        return jsonResponse({ success: true });

      case 'delete_coupon':
        await deleteCoupon(params.couponId as string);
        return jsonResponse({ success: true });

      // ============================================
      // v2 OPERATIONS
      // ============================================

      case 'suspend_tenant':
        await suspendTenant(admin, auditCtx, params.tenantId as string, params.reason as string);
        return jsonResponse({ success: true });

      case 'reactivate_tenant':
        await reactivateTenant(admin, auditCtx, params.tenantId as string, params.reason as string | null);
        return jsonResponse({ success: true });

      case 'refresh_tenant_health':
        return jsonResponse({ success: true, data: await refreshTenantHealth(admin, params.tenantId as string) });

      case 'list_audit_log':
        return jsonResponse({ success: true, data: await listAuditLog(admin, params) });

      case 'impersonate_start':
        return jsonResponse({ success: true, data: await impersonateStart(admin, auditCtx, params.tenantId as string, params.reason as string) });

      case 'impersonate_end':
        await impersonateEnd(admin, auditCtx, params.sessionId as string);
        return jsonResponse({ success: true });

      case 'upsert_feature_flag':
        return jsonResponse({ success: true, data: await upsertFeatureFlag(admin, auditCtx, params) });

      case 'delete_feature_flag':
        await deleteFeatureFlag(admin, auditCtx, params.key as string);
        return jsonResponse({ success: true });

      case 'list_failed_webhooks':
        return jsonResponse({ success: true, data: await listFailedWebhooks(admin, params) });

      case 'retry_webhook':
        await retryWebhook(admin, auditCtx, params.webhookId as string);
        return jsonResponse({ success: true });

      case 'reset_user_password':
        return jsonResponse({ success: true, data: await resetUserPassword(admin, auditCtx, params.userId as string) });

      case 'toggle_super_admin':
        await toggleSuperAdmin(admin, auditCtx, params.userId as string, params.isSuperAdmin as boolean);
        return jsonResponse({ success: true });

      case 'issue_refund':
        await issueRefund(admin, auditCtx, params);
        return jsonResponse({ success: true });

      case 'get_tenant_usage_trend':
        return jsonResponse({ success: true, data: await getTenantUsageTrend(admin, params.tenantId as string, (params.months as number) || 12) });

      case 'get_cohort_retention':
        return jsonResponse({ success: true, data: await getCohortRetention(admin, (params.monthsBack as number) || 12) });

      case 'get_mrr_waterfall':
        return jsonResponse({ success: true, data: await getMrrWaterfall(admin, (params.monthsBack as number) || 12) });

      case 'get_feature_adoption':
        return jsonResponse({ success: true, data: await getFeatureAdoption(admin) });

      case 'list_all_tickets':
        return jsonResponse({ success: true, data: await listAllTickets(admin, params) });

      // ============================================
      // PHASE 6: WHITELABELING
      // ============================================

      case 'set_tenant_subdomain':
        return jsonResponse({ success: true, data: await setTenantSubdomain(admin, auditCtx, params.tenantId as string, params.subdomain as string | null) });

      case 'set_custom_domain':
        return jsonResponse({ success: true, data: await setCustomDomain(admin, auditCtx, params.tenantId as string, params.domain as string | null) });

      case 'verify_custom_domain':
        return jsonResponse({ success: true, data: await verifyCustomDomain(admin, auditCtx, params.tenantId as string) });

      case 'update_whitelabel_config':
        return jsonResponse({ success: true, data: await updateWhitelabelConfig(admin, auditCtx, params.tenantId as string, params.config as Record<string, unknown>) });

      case 'set_tenant_smtp':
        return jsonResponse({ success: true, data: await setTenantSmtp(admin, auditCtx, params) });

      case 'test_tenant_smtp':
        return jsonResponse({ success: true, data: await testTenantSmtp(admin, auditCtx, params.tenantId as string, params.testTo as string) });

      case 'disable_tenant_smtp':
        await disableTenantSmtp(admin, auditCtx, params.tenantId as string);
        return jsonResponse({ success: true });

      case 'export_tenant_data':
        return jsonResponse({ success: true, data: await exportTenantData(admin, auditCtx, params.tenantId as string) });

      default:
        return jsonResponse({ success: false, error: `Unknown operation: ${operation}` }, 400);
    }
  } catch (err) {
    console.error('Admin API error:', err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================
// OPERATION IMPLEMENTATIONS
// ============================================

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

async function getPlatformStats(admin: SupabaseAdmin) {
  const [
    { count: totalTenants },
    { count: totalUsers },
    { count: totalProducts },
    { count: activeReturns },
    { data: subscriptions },
    { data: credits },
    { count: recentSignups },
  ] = await Promise.all([
    admin.from('tenants').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('products').select('*', { count: 'exact', head: true }),
    admin.from('rh_returns').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("COMPLETED","CANCELLED","REJECTED")'),
    admin.from('billing_subscriptions').select('plan, status'),
    admin.from('billing_credits').select('monthly_used'),
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  const planDist = { free: 0, pro: 0, enterprise: 0 };
  let paidTenants = 0;
  for (const sub of subscriptions || []) {
    const p = sub.plan as keyof typeof planDist;
    if (planDist[p] !== undefined) planDist[p]++;
    if (p !== 'free' && sub.status === 'active') paidTenants++;
  }
  // Count tenants without subscriptions as free
  planDist.free = (totalTenants || 0) - planDist.pro - planDist.enterprise;

  const aiCreditsUsed = (credits || []).reduce(
    (sum: number, c: { monthly_used: number }) => sum + (c.monthly_used || 0), 0
  );

  // MRR estimation: Pro=49, Enterprise=149 (monthly)
  const mrr = planDist.pro * 49 + planDist.enterprise * 149;

  return {
    totalTenants: totalTenants || 0,
    totalUsers: totalUsers || 0,
    totalProducts: totalProducts || 0,
    activeReturns: activeReturns || 0,
    paidTenants,
    mrr,
    recentSignups7d: recentSignups || 0,
    aiCreditsUsedMonth: aiCreditsUsed,
    planDistribution: planDist,
  };
}

async function listTenants(admin: SupabaseAdmin) {
  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id, name, slug, address, country, eori, vat, stripe_customer_id, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch billing data for all tenants
  const tenantIds = (tenants || []).map((t: { id: string }) => t.id);

  const [
    { data: subscriptions },
    { data: modules },
    { data: credits },
    { data: userCounts },
    { data: productCounts },
  ] = await Promise.all([
    admin.from('billing_subscriptions').select('tenant_id, plan').in('tenant_id', tenantIds),
    admin.from('billing_module_subscriptions').select('tenant_id, module_id').eq('status', 'active').in('tenant_id', tenantIds),
    admin.from('billing_credits').select('tenant_id, monthly_allowance, monthly_used, purchased_balance').in('tenant_id', tenantIds),
    admin.from('profiles').select('tenant_id'),
    admin.from('products').select('tenant_id'),
  ]);

  // Build lookup maps
  const subMap = new Map((subscriptions || []).map((s: { tenant_id: string; plan: string }) => [s.tenant_id, s.plan]));
  const modMap = new Map<string, string[]>();
  for (const m of modules || []) {
    const list = modMap.get(m.tenant_id) || [];
    list.push(m.module_id);
    modMap.set(m.tenant_id, list);
  }
  const creditMap = new Map(
    (credits || []).map((c: { tenant_id: string; monthly_allowance: number; monthly_used: number; purchased_balance: number }) =>
      [c.tenant_id, c])
  );

  // Count users and products per tenant
  const userCountMap = new Map<string, number>();
  for (const p of userCounts || []) {
    userCountMap.set(p.tenant_id, (userCountMap.get(p.tenant_id) || 0) + 1);
  }

  const productCountMap = new Map<string, number>();
  for (const p of productCounts || []) {
    productCountMap.set(p.tenant_id, (productCountMap.get(p.tenant_id) || 0) + 1);
  }

  return (tenants || []).map((t: Record<string, unknown>) => {
    const cred = creditMap.get(t.id as string) as { monthly_allowance: number; monthly_used: number; purchased_balance: number } | undefined;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      address: t.address,
      country: t.country,
      eori: t.eori,
      vat: t.vat,
      stripeCustomerId: t.stripe_customer_id,
      createdAt: t.created_at,
      plan: subMap.get(t.id as string) || 'free',
      activeModules: modMap.get(t.id as string) || [],
      userCount: userCountMap.get(t.id as string) || 0,
      productCount: productCountMap.get(t.id as string) || 0,
      monthlyAllowance: cred?.monthly_allowance || 3,
      monthlyUsed: cred?.monthly_used || 0,
      purchasedBalance: cred?.purchased_balance || 0,
    };
  });
}

async function getTenant(admin: SupabaseAdmin, tenantId: string) {
  // Parallel fetch tenant + related data
  const [
    { data: tenant, error: tenantErr },
    { data: users },
    { data: subscription },
    { data: modules },
    { data: credits },
    { data: transactions },
    { data: invoices },
    { count: productCount },
    { count: docCount },
    { count: returnCount },
    { count: ticketCount },
    { count: supplierCount },
  ] = await Promise.all([
    admin.from('tenants').select('*').eq('id', tenantId).single(),
    admin.from('profiles').select('id, email, name, role, tenant_id, is_super_admin, created_at')
      .eq('tenant_id', tenantId),
    admin.from('billing_subscriptions').select('*').eq('tenant_id', tenantId).maybeSingle(),
    admin.from('billing_module_subscriptions').select('*').eq('tenant_id', tenantId).eq('status', 'active'),
    admin.from('billing_credits').select('*').eq('tenant_id', tenantId).maybeSingle(),
    admin.from('billing_credit_transactions').select('*').eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }).limit(50),
    admin.from('billing_invoices').select('*').eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }).limit(20),
    admin.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('documents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('rh_returns').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('rh_tickets').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('suppliers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ]);

  if (tenantErr || !tenant) throw new Error('Tenant not found');

  // Get last_sign_in_at from auth for each user
  const signInMap = new Map<string, string | null>();
  for (const u of users || []) {
    try {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(u.id);
      signInMap.set(u.id, authUser?.last_sign_in_at || null);
    } catch {
      signInMap.set(u.id, null);
    }
  }

  const mappedUsers = (users || []).map((u: Record<string, unknown>) => ({
    id: u.id,
    email: u.email || '',
    fullName: u.name,
    role: u.role,
    tenantId: u.tenant_id,
    tenantName: tenant.name,
    isSuperAdmin: u.is_super_admin || false,
    createdAt: u.created_at,
    lastSignInAt: signInMap.get(u.id as string) || null,
  }));

  const mappedTransactions = (transactions || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    tenantId: t.tenant_id,
    type: t.type,
    amount: t.amount,
    balanceAfter: t.balance_after,
    source: t.source,
    description: t.description,
    createdAt: t.created_at,
  }));

  const mappedInvoices = (invoices || []).map((i: Record<string, unknown>) => ({
    id: i.id,
    tenantId: i.tenant_id,
    stripeInvoiceId: i.stripe_invoice_id,
    amountDue: i.amount_due,
    amountPaid: i.amount_paid,
    currency: i.currency,
    status: i.status,
    invoicePdfUrl: i.invoice_pdf_url,
    periodStart: i.period_start,
    periodEnd: i.period_end,
    createdAt: i.created_at,
  }));

  const cred = credits as { monthly_allowance: number; monthly_used: number; purchased_balance: number } | null;

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    address: tenant.address,
    country: tenant.country,
    eori: tenant.eori,
    vat: tenant.vat,
    stripeCustomerId: tenant.stripe_customer_id,
    createdAt: tenant.created_at,
    plan: subscription?.plan || 'free',
    activeModules: (modules || []).map((m: { module_id: string }) => m.module_id),
    userCount: (users || []).length,
    productCount: productCount || 0,
    monthlyAllowance: cred?.monthly_allowance || 3,
    monthlyUsed: cred?.monthly_used || 0,
    purchasedBalance: cred?.purchased_balance || 0,
    settings: tenant.settings || {},
    users: mappedUsers,
    creditTransactions: mappedTransactions,
    invoices: mappedInvoices,
    usage: {
      products: productCount || 0,
      documents: docCount || 0,
      adminUsers: (users || []).length,
      returns: returnCount || 0,
      tickets: ticketCount || 0,
      suppliers: supplierCount || 0,
      storageMb: 0, // Would need storage API call
    },
  };
}

async function updateTenantPlan(admin: SupabaseAdmin, tenantId: string, plan: string) {
  // Upsert billing_subscriptions
  const { data: existing } = await admin
    .from('billing_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing) {
    await admin
      .from('billing_subscriptions')
      .update({ plan, status: 'active', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);
  } else {
    await admin
      .from('billing_subscriptions')
      .insert({
        tenant_id: tenantId,
        plan,
        status: 'active',
        stripe_subscription_id: `admin_assigned_${Date.now()}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
  }

  // Update monthly credit allowance based on plan
  const allowanceMap: Record<string, number> = { free: 3, pro: 25, enterprise: 100 };
  const allowance = allowanceMap[plan] || 3;

  const { data: existingCredits } = await admin
    .from('billing_credits')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existingCredits) {
    await admin
      .from('billing_credits')
      .update({ monthly_allowance: allowance })
      .eq('tenant_id', tenantId);
  } else {
    await admin
      .from('billing_credits')
      .insert({
        tenant_id: tenantId,
        monthly_allowance: allowance,
        monthly_used: 0,
        purchased_balance: 0,
      });
  }
}

async function toggleModule(admin: SupabaseAdmin, tenantId: string, moduleId: string, active: boolean) {
  if (active) {
    // Check if already exists
    const { data: existing } = await admin
      .from('billing_module_subscriptions')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (existing) {
      await admin
        .from('billing_module_subscriptions')
        .update({ status: 'active' })
        .eq('id', existing.id);
    } else {
      await admin
        .from('billing_module_subscriptions')
        .insert({
          tenant_id: tenantId,
          module_id: moduleId,
          status: 'active',
          stripe_subscription_item_id: `admin_assigned_${Date.now()}`,
        });
    }
  } else {
    await admin
      .from('billing_module_subscriptions')
      .update({ status: 'canceled' })
      .eq('tenant_id', tenantId)
      .eq('module_id', moduleId);
  }
}

async function listUsers(admin: SupabaseAdmin) {
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, name, role, tenant_id, is_super_admin, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Get tenant names
  const tenantIds = [...new Set((profiles || []).map((p: { tenant_id: string }) => p.tenant_id))];
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, name')
    .in('id', tenantIds);

  const tenantMap = new Map((tenants || []).map((t: { id: string; name: string }) => [t.id, t.name]));

  // Get last_sign_in_at from auth
  const signInMap = new Map<string, string | null>();
  for (const p of profiles || []) {
    try {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(p.id);
      signInMap.set(p.id, authUser?.last_sign_in_at || null);
    } catch {
      signInMap.set(p.id, null);
    }
  }

  return (profiles || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    email: p.email || '',
    fullName: p.name,
    role: p.role,
    tenantId: p.tenant_id,
    tenantName: tenantMap.get(p.tenant_id as string) || '',
    isSuperAdmin: p.is_super_admin || false,
    createdAt: p.created_at,
    lastSignInAt: signInMap.get(p.id as string) || null,
  }));
}

async function updateUserRole(admin: SupabaseAdmin, userId: string, role: string) {
  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

async function toggleUserStatus(admin: SupabaseAdmin, userId: string, active: boolean) {
  if (active) {
    // Unban user
    await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
  } else {
    // Ban user (effectively disable)
    await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' }); // ~100 years
  }
}

async function adjustCredits(admin: SupabaseAdmin, tenantId: string, amount: number, reason: string) {
  // Get current balance
  const { data: credits } = await admin
    .from('billing_credits')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const currentPurchased = credits?.purchased_balance || 0;
  const newBalance = currentPurchased + amount;

  if (credits) {
    await admin
      .from('billing_credits')
      .update({ purchased_balance: Math.max(0, newBalance) })
      .eq('tenant_id', tenantId);
  } else {
    await admin
      .from('billing_credits')
      .insert({
        tenant_id: tenantId,
        monthly_allowance: 3,
        monthly_used: 0,
        purchased_balance: Math.max(0, amount),
      });
  }

  // Log transaction
  const totalAfter = (credits?.monthly_allowance || 3) - (credits?.monthly_used || 0) + Math.max(0, newBalance);
  await admin.from('billing_credit_transactions').insert({
    tenant_id: tenantId,
    type: 'admin_adjust',
    amount,
    balance_after: totalAfter,
    source: 'admin_portal',
    description: reason || 'Admin credit adjustment',
  });
}

async function setMonthlyAllowance(admin: SupabaseAdmin, tenantId: string, allowance: number) {
  const { data: existing } = await admin
    .from('billing_credits')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing) {
    await admin
      .from('billing_credits')
      .update({ monthly_allowance: allowance })
      .eq('tenant_id', tenantId);
  } else {
    await admin
      .from('billing_credits')
      .insert({
        tenant_id: tenantId,
        monthly_allowance: allowance,
        monthly_used: 0,
        purchased_balance: 0,
      });
  }
}

// ============================================
// STRIPE COUPON OPERATIONS
// ============================================

async function getStripeClient() {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');
  return stripeKey;
}

async function stripeFetch(endpoint: string, options?: RequestInit) {
  const key = await getStripeClient();
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Stripe error: ${response.status}`);
  }

  return response.json();
}

async function listCoupons() {
  const [couponsData, promosData] = await Promise.all([
    stripeFetch('/coupons?limit=100'),
    stripeFetch('/promotion_codes?limit=100'),
  ]);

  const promoMap = new Map<string, { id: string; code: string }>();
  for (const promo of promosData.data || []) {
    promoMap.set(promo.coupon.id, { id: promo.id, code: promo.code });
  }

  return (couponsData.data || []).map((c: Record<string, unknown>) => {
    const promo = promoMap.get(c.id as string);
    return {
      id: c.id,
      name: c.name || c.id,
      promoCode: promo?.code || null,
      promoCodeId: promo?.id || null,
      amountOff: c.amount_off ? (c.amount_off as number) / 100 : null,
      percentOff: c.percent_off,
      currency: c.currency,
      duration: c.duration,
      durationInMonths: c.duration_in_months,
      maxRedemptions: c.max_redemptions,
      timesRedeemed: c.times_redeemed || 0,
      active: (c.valid as boolean) ?? true,
      expiresAt: c.redeem_by ? new Date((c.redeem_by as number) * 1000).toISOString() : null,
      createdAt: new Date((c.created as number) * 1000).toISOString(),
    };
  });
}

async function createCoupon(params: Record<string, unknown>) {
  // Build coupon form data
  const formParts: string[] = [];
  formParts.push(`name=${encodeURIComponent(params.name as string)}`);

  if (params.discountType === 'percent') {
    formParts.push(`percent_off=${params.discountValue}`);
  } else {
    formParts.push(`amount_off=${Math.round((params.discountValue as number) * 100)}`);
    formParts.push(`currency=${params.currency || 'eur'}`);
  }

  formParts.push(`duration=${params.duration}`);
  if (params.duration === 'repeating' && params.durationInMonths) {
    formParts.push(`duration_in_months=${params.durationInMonths}`);
  }
  if (params.maxRedemptions) {
    formParts.push(`max_redemptions=${params.maxRedemptions}`);
  }
  if (params.expiresAt) {
    formParts.push(`redeem_by=${Math.floor(new Date(params.expiresAt as string).getTime() / 1000)}`);
  }

  const coupon = await stripeFetch('/coupons', {
    method: 'POST',
    body: formParts.join('&'),
  });

  // Create promotion code if specified
  let promoCode = null;
  let promoCodeId = null;
  if (params.promoCode) {
    const promo = await stripeFetch('/promotion_codes', {
      method: 'POST',
      body: `coupon=${coupon.id}&code=${encodeURIComponent(params.promoCode as string)}`,
    });
    promoCode = promo.code;
    promoCodeId = promo.id;
  }

  return {
    id: coupon.id,
    name: coupon.name,
    promoCode,
    promoCodeId,
    amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
    percentOff: coupon.percent_off,
    currency: coupon.currency,
    duration: coupon.duration,
    durationInMonths: coupon.duration_in_months,
    maxRedemptions: coupon.max_redemptions,
    timesRedeemed: 0,
    active: true,
    expiresAt: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
    createdAt: new Date(coupon.created * 1000).toISOString(),
  };
}

async function updateCouponStatus(couponId: string, active: boolean) {
  // Stripe doesn't allow reactivating coupons, but we can manage promo codes
  if (!active) {
    // Get promo codes for this coupon and deactivate them
    const promos = await stripeFetch(`/promotion_codes?coupon=${couponId}&limit=10`);
    for (const promo of promos.data || []) {
      await stripeFetch(`/promotion_codes/${promo.id}`, {
        method: 'POST',
        body: 'active=false',
      });
    }
  }
}

async function deleteCoupon(couponId: string) {
  await stripeFetch(`/coupons/${couponId}`, { method: 'DELETE' });
}

// ============================================
// v2: AUDIT LOG HELPER
// ============================================

interface AuditContext {
  adminId: string;
  adminEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
}

async function audit(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  params: {
    action: string;
    targetType: string;
    targetId?: string | null;
    targetLabel?: string | null;
    changes?: Record<string, unknown> | null;
    reason?: string | null;
  },
) {
  try {
    await admin.rpc('log_admin_action', {
      p_admin_id: ctx.adminId,
      p_admin_email: ctx.adminEmail,
      p_action: params.action,
      p_target_type: params.targetType,
      p_target_id: params.targetId ?? null,
      p_target_label: params.targetLabel ?? null,
      p_changes: params.changes ?? null,
      p_reason: params.reason ?? null,
      p_ip_address: ctx.ipAddress,
      p_user_agent: ctx.userAgent,
    });
  } catch (err) {
    console.error('audit log failed:', err);
  }
}

// ============================================
// v2: SUSPEND / REACTIVATE
// ============================================

async function suspendTenant(admin: SupabaseAdmin, ctx: AuditContext, tenantId: string, reason: string) {
  const { data: before } = await admin.from('tenants').select('status, name').eq('id', tenantId).single();
  await admin
    .from('tenants')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('id', tenantId);
  await audit(admin, ctx, {
    action: 'suspend_tenant',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: before?.name,
    changes: { status: { before: before?.status, after: 'suspended' } },
    reason,
  });
}

async function reactivateTenant(admin: SupabaseAdmin, ctx: AuditContext, tenantId: string, reason: string | null) {
  const { data: before } = await admin.from('tenants').select('status, name').eq('id', tenantId).single();
  await admin
    .from('tenants')
    .update({
      status: 'active',
      suspended_at: null,
      suspended_reason: null,
    })
    .eq('id', tenantId);
  await audit(admin, ctx, {
    action: 'reactivate_tenant',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: before?.name,
    changes: { status: { before: before?.status, after: 'active' } },
    reason,
  });
}

async function refreshTenantHealth(admin: SupabaseAdmin, tenantId: string) {
  await admin.rpc('compute_tenant_health', { p_tenant_id: tenantId });
  const { data } = await admin
    .from('tenants')
    .select('health_score, health_factors, health_updated_at')
    .eq('id', tenantId)
    .single();
  return {
    score: data?.health_score ?? 0,
    factors: data?.health_factors ?? {},
    updatedAt: data?.health_updated_at,
  };
}

// ============================================
// v2: AUDIT LOG LISTING
// ============================================

async function listAuditLog(admin: SupabaseAdmin, params: Record<string, unknown>) {
  const limit = (params.limit as number) || 50;
  const offset = (params.offset as number) || 0;
  let q = admin.from('admin_audit_log').select('*', { count: 'exact' });
  if (params.adminId) q = q.eq('admin_id', params.adminId as string);
  if (params.action) q = q.eq('action', params.action as string);
  if (params.targetType) q = q.eq('target_type', params.targetType as string);
  if (params.targetId) q = q.eq('target_id', params.targetId as string);
  if (params.fromDate) q = q.gte('created_at', params.fromDate as string);
  if (params.toDate) q = q.lte('created_at', params.toDate as string);
  const { data, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  // deno-lint-ignore no-explicit-any
  const entries = (data || []).map((r: any) => ({
    id: r.id,
    adminId: r.admin_id,
    adminEmail: r.admin_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.target_label,
    changes: r.changes,
    reason: r.reason,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    createdAt: r.created_at,
  }));
  return { entries, total: count || 0 };
}

// ============================================
// v2: IMPERSONATION
// ============================================

async function impersonateStart(admin: SupabaseAdmin, ctx: AuditContext, tenantId: string, reason: string) {
  const { data: tenant } = await admin.from('tenants').select('id, name').eq('id', tenantId).single();
  if (!tenant) throw new Error('Tenant not found');
  const sessionId = crypto.randomUUID();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 30 * 60 * 1000); // 30 min
  // Simple token = base64 JSON with session metadata. Real impersonation at
  // the RLS level would need a signed JWT + custom auth hook. For phase 1 we
  // rely on client-side Tenant-ID override in requests and server-side checks
  // in downstream code paths (future work). The token is primarily an audit
  // marker and UI banner trigger.
  const payload = {
    adminId: ctx.adminId,
    adminEmail: ctx.adminEmail,
    tenantId,
    sessionId,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const token = btoa(JSON.stringify(payload));
  await audit(admin, ctx, {
    action: 'impersonate_start',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: tenant.name,
    changes: { sessionId, expiresAt: expiresAt.toISOString() },
    reason,
  });
  return {
    token,
    tenantId,
    tenantName: tenant.name,
    sessionId,
    expiresAt: expiresAt.toISOString(),
    startedAt: startedAt.toISOString(),
  };
}

async function impersonateEnd(admin: SupabaseAdmin, ctx: AuditContext, sessionId: string) {
  await audit(admin, ctx, {
    action: 'impersonate_end',
    targetType: 'impersonation',
    targetId: sessionId,
    changes: null,
  });
}

// ============================================
// v2: FEATURE FLAGS
// ============================================

async function upsertFeatureFlag(admin: SupabaseAdmin, ctx: AuditContext, params: Record<string, unknown>) {
  const key = params.key as string;
  if (!key) throw new Error('Feature flag key is required');

  const { data: before } = await admin.from('admin_feature_flags').select('*').eq('key', key).maybeSingle();

  const payload: Record<string, unknown> = {
    key,
    updated_at: new Date().toISOString(),
  };
  if (params.description !== undefined) payload.description = params.description;
  if (params.enabledGlobally !== undefined) payload.enabled_globally = params.enabledGlobally;
  if (params.rolloutPercentage !== undefined) payload.rollout_percentage = params.rolloutPercentage;
  if (params.enabledForTenants !== undefined) payload.enabled_for_tenants = params.enabledForTenants;
  if (params.disabledForTenants !== undefined) payload.disabled_for_tenants = params.disabledForTenants;

  const { data, error } = await admin
    .from('admin_feature_flags')
    .upsert(payload, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;

  await audit(admin, ctx, {
    action: before ? 'update_feature_flag' : 'create_feature_flag',
    targetType: 'feature_flag',
    targetId: data.id,
    targetLabel: key,
    changes: before
      ? {
          enabledGlobally: { before: before.enabled_globally, after: data.enabled_globally },
          rolloutPercentage: { before: before.rollout_percentage, after: data.rollout_percentage },
        }
      : (payload as Record<string, unknown>),
    reason: (params.reason as string) || null,
  });

  return {
    id: data.id,
    key: data.key,
    description: data.description,
    enabledGlobally: !!data.enabled_globally,
    rolloutPercentage: Number(data.rollout_percentage) || 0,
    enabledForTenants: data.enabled_for_tenants || [],
    disabledForTenants: data.disabled_for_tenants || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function deleteFeatureFlag(admin: SupabaseAdmin, ctx: AuditContext, key: string) {
  const { data: before } = await admin.from('admin_feature_flags').select('id').eq('key', key).maybeSingle();
  await admin.from('admin_feature_flags').delete().eq('key', key);
  await audit(admin, ctx, {
    action: 'delete_feature_flag',
    targetType: 'feature_flag',
    targetId: before?.id,
    targetLabel: key,
    changes: null,
  });
}

// ============================================
// v2: WEBHOOK DLQ
// ============================================

async function listFailedWebhooks(admin: SupabaseAdmin, params: Record<string, unknown>) {
  const limit = (params.limit as number) || 100;
  let q = admin
    .from('shopify_webhook_events')
    .select('id, tenant_id, shop_domain, topic, status, attempts, last_error, received_at, processed_at')
    .in('status', ['failed', 'dead_letter']);
  if (params.tenantId) q = q.eq('tenant_id', params.tenantId as string);
  const { data } = await q.order('received_at', { ascending: false }).limit(limit);
  // deno-lint-ignore no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    shopDomain: r.shop_domain,
    topic: r.topic,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    receivedAt: r.received_at,
    processedAt: r.processed_at,
  }));
}

async function retryWebhook(admin: SupabaseAdmin, ctx: AuditContext, webhookId: string) {
  // Reset status to pending; external processor (or future cron) will pick it up.
  await admin
    .from('shopify_webhook_events')
    .update({ status: 'pending', last_error: null })
    .eq('id', webhookId);
  await audit(admin, ctx, {
    action: 'retry_webhook',
    targetType: 'webhook',
    targetId: webhookId,
    changes: { status: { before: 'failed', after: 'pending' } },
  });
}

// ============================================
// v2: USER MANAGEMENT EXTENDED
// ============================================

async function resetUserPassword(admin: SupabaseAdmin, ctx: AuditContext, userId: string) {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (!u?.user?.email) throw new Error('User not found or no email');
  // generateLink returns a magic link / reset link that can be sent to the user
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: u.user.email,
  });
  if (error) throw error;
  await audit(admin, ctx, {
    action: 'reset_user_password',
    targetType: 'user',
    targetId: userId,
    targetLabel: u.user.email,
  });
  return { resetLink: data.properties?.action_link || '' };
}

async function toggleSuperAdmin(admin: SupabaseAdmin, ctx: AuditContext, userId: string, isSuperAdmin: boolean) {
  const { data: before } = await admin.from('profiles').select('email, is_super_admin').eq('id', userId).single();
  await admin.from('profiles').update({ is_super_admin: isSuperAdmin }).eq('id', userId);
  await audit(admin, ctx, {
    action: 'toggle_super_admin',
    targetType: 'user',
    targetId: userId,
    targetLabel: before?.email,
    changes: { isSuperAdmin: { before: before?.is_super_admin, after: isSuperAdmin } },
  });
}

// ============================================
// v2: REFUNDS
// ============================================

async function issueRefund(admin: SupabaseAdmin, ctx: AuditContext, params: Record<string, unknown>) {
  const tenantId = params.tenantId as string;
  const amountCents = params.amountCents as number;
  const reason = params.reason as string;
  const invoiceId = params.invoiceId as string | undefined;

  // Log as a credit transaction for audit completeness
  const { data: credits } = await admin.from('billing_credits').select('id, purchased_balance').eq('tenant_id', tenantId).maybeSingle();
  const newBalance = (credits?.purchased_balance || 0) + Math.floor(amountCents / 100);
  await admin.from('billing_credit_transactions').insert({
    tenant_id: tenantId,
    type: 'refund',
    amount: Math.floor(amountCents / 100),
    balance_after: newBalance,
    source: 'purchased',
    description: reason,
    metadata: { invoiceId, amountCents, issuedBy: ctx.adminId },
  });
  if (credits) {
    await admin.from('billing_credits').update({ purchased_balance: newBalance }).eq('id', credits.id);
  }
  await audit(admin, ctx, {
    action: 'issue_refund',
    targetType: 'credit',
    targetId: tenantId,
    changes: { amountCents, invoiceId },
    reason,
  });
}

// ============================================
// v2: ANALYTICS (lightweight implementations)
// ============================================

async function getTenantUsageTrend(admin: SupabaseAdmin, tenantId: string, months: number) {
  // SQL window: last N months. We aggregate billing_usage_logs + wh_shipments.
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data: logs } = await admin
    .from('billing_usage_logs')
    .select('resource_type, action, quantity, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .limit(50000);

  const byMonth = new Map<string, Record<string, number>>();
  // deno-lint-ignore no-explicit-any
  (logs || []).forEach((r: any) => {
    const m = (r.created_at as string).slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, { products: 0, batches: 0, shipments: 0, returns: 0, documents: 0, aiCreditsUsed: 0 });
    const row = byMonth.get(m)!;
    if (r.resource_type === 'product' && r.action === 'create') row.products += r.quantity || 1;
    if (r.resource_type === 'batch' && r.action === 'create') row.batches += r.quantity || 1;
    if (r.resource_type === 'document' && r.action === 'create') row.documents += r.quantity || 1;
    if (r.resource_type === 'return' && r.action === 'create') row.returns += r.quantity || 1;
    if (r.resource_type === 'ai_credit' && r.action === 'consume') row.aiCreditsUsed += r.quantity || 1;
  });

  const { data: ships } = await admin
    .from('wh_shipments')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .limit(10000);
  // deno-lint-ignore no-explicit-any
  (ships || []).forEach((r: any) => {
    const m = (r.created_at as string).slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, { products: 0, batches: 0, shipments: 0, returns: 0, documents: 0, aiCreditsUsed: 0 });
    byMonth.get(m)!.shipments += 1;
  });

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}

async function getCohortRetention(admin: SupabaseAdmin, monthsBack: number) {
  // Cohort = signup month of tenant. Retention = tenant had activity in month N.
  // Activity = at least one billing_usage_log OR wh_shipments OR returns in that month.
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, created_at')
    .gte('created_at', since.toISOString());

  const cohorts: Record<string, string[]> = {};
  // deno-lint-ignore no-explicit-any
  (tenants || []).forEach((t: any) => {
    const m = (t.created_at as string).slice(0, 7);
    if (!cohorts[m]) cohorts[m] = [];
    cohorts[m].push(t.id);
  });

  const now = new Date();
  const result = [];
  for (const cohortMonth of Object.keys(cohorts).sort()) {
    const tenantIds = cohorts[cohortMonth];
    const cohortDate = new Date(cohortMonth + '-01');
    const monthsElapsed = Math.min(
      11,
      (now.getFullYear() - cohortDate.getFullYear()) * 12 + (now.getMonth() - cohortDate.getMonth()),
    );
    for (let offset = 0; offset <= monthsElapsed; offset++) {
      const windowStart = new Date(cohortDate);
      windowStart.setMonth(windowStart.getMonth() + offset);
      const windowEnd = new Date(windowStart);
      windowEnd.setMonth(windowEnd.getMonth() + 1);
      // Count tenants from this cohort that had any activity in this window
      const { data: active } = await admin
        .from('billing_usage_logs')
        .select('tenant_id', { count: 'exact' })
        .in('tenant_id', tenantIds)
        .gte('created_at', windowStart.toISOString())
        .lt('created_at', windowEnd.toISOString())
        .limit(10000);
      // deno-lint-ignore no-explicit-any
      const uniqueActive = new Set((active || []).map((r: any) => r.tenant_id));
      result.push({
        cohortMonth,
        monthOffset: offset,
        tenantCount: tenantIds.length,
        activeCount: uniqueActive.size,
        retentionPct: tenantIds.length > 0 ? Math.round((uniqueActive.size / tenantIds.length) * 100) : 0,
      });
    }
  }
  return result;
}

async function getMrrWaterfall(admin: SupabaseAdmin, monthsBack: number) {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  const { data: subs } = await admin
    .from('billing_subscriptions')
    .select('tenant_id, plan, status, current_period_start, current_period_end, created_at');
  const planMrr: Record<string, number> = { free: 0, pro: 39, enterprise: 199 };

  const months: string[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const result: MrrMonth[] = months.map((m) => ({
    month: m,
    startMrr: 0,
    newMrr: 0,
    expansionMrr: 0,
    contractionMrr: 0,
    churnMrr: 0,
    endMrr: 0,
  }));

  // Simple: compute MRR per month as sum of active subscriptions in that month.
  // deno-lint-ignore no-explicit-any
  for (const s of (subs || []) as any[]) {
    const mrr = planMrr[s.plan] || 0;
    months.forEach((monthKey, idx) => {
      const monthStart = new Date(monthKey + '-01');
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const subStart = s.current_period_start ? new Date(s.current_period_start) : new Date(s.created_at);
      const subEnd = s.status === 'canceled' && s.current_period_end ? new Date(s.current_period_end) : monthEnd;
      if (subStart < monthEnd && subEnd > monthStart) {
        result[idx].endMrr += mrr;
      }
    });
  }
  // Derive deltas
  for (let i = 1; i < result.length; i++) {
    result[i].startMrr = result[i - 1].endMrr;
    const delta = result[i].endMrr - result[i].startMrr;
    if (delta > 0) result[i].newMrr = delta;
    else if (delta < 0) result[i].churnMrr = -delta;
  }
  return result;
}

interface MrrMonth {
  month: string;
  startMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnMrr: number;
  endMrr: number;
}

async function getFeatureAdoption(admin: SupabaseAdmin) {
  const { count: totalTenants } = await admin.from('tenants').select('*', { count: 'exact', head: true });
  const { data: modules } = await admin
    .from('billing_module_subscriptions')
    .select('tenant_id, module_id, status')
    .eq('status', 'active');

  const byModule: Record<string, Set<string>> = {};
  // deno-lint-ignore no-explicit-any
  (modules || []).forEach((m: any) => {
    if (!byModule[m.module_id]) byModule[m.module_id] = new Set();
    byModule[m.module_id].add(m.tenant_id);
  });

  const labels: Record<string, string> = {
    returns_hub_starter: 'Returns Hub Starter',
    returns_hub_professional: 'Returns Hub Professional',
    returns_hub_business: 'Returns Hub Business',
    supplier_portal: 'Supplier Portal',
    customer_portal: 'Customer Portal',
    custom_domain: 'Custom Domain',
  };

  return Object.entries(byModule).map(([feature, tenantSet]) => ({
    feature,
    label: labels[feature] || feature,
    activeTenants: tenantSet.size,
    totalTenants: totalTenants || 0,
    adoptionPct: (totalTenants || 0) > 0 ? Math.round((tenantSet.size / (totalTenants || 1)) * 100) : 0,
  }));
}

// ============================================
// v2: CROSS-TENANT TICKETS
// ============================================

async function listAllTickets(admin: SupabaseAdmin, params: Record<string, unknown>) {
  const limit = (params.limit as number) || 100;
  let q = admin
    .from('rh_tickets')
    .select('id, tenant_id, subject, status, priority, customer_id, assigned_to, created_at, updated_at');
  if (params.status && Array.isArray(params.status)) q = q.in('status', params.status as string[]);
  if (params.priority && Array.isArray(params.priority)) q = q.in('priority', params.priority as string[]);
  if (params.tenantId) q = q.eq('tenant_id', params.tenantId as string);
  const { data: tickets } = await q.order('created_at', { ascending: false }).limit(limit);

  // Resolve tenant names + customer emails in batch
  // deno-lint-ignore no-explicit-any
  const tenantIds = Array.from(new Set((tickets || []).map((t: any) => t.tenant_id).filter(Boolean)));
  // deno-lint-ignore no-explicit-any
  const customerIds = Array.from(new Set((tickets || []).map((t: any) => t.customer_id).filter(Boolean)));
  const [tenantsRes, customersRes] = await Promise.all([
    tenantIds.length ? admin.from('tenants').select('id, name').in('id', tenantIds) : Promise.resolve({ data: [] }),
    customerIds.length ? admin.from('rh_customers').select('id, email').in('id', customerIds) : Promise.resolve({ data: [] }),
  ]);
  const tenantMap = new Map((tenantsRes.data || []).map((t: { id: string; name: string }) => [t.id, t.name]));
  const customerMap = new Map((customersRes.data || []).map((c: { id: string; email?: string }) => [c.id, c.email]));

  // deno-lint-ignore no-explicit-any
  return (tickets || []).map((t: any) => ({
    id: t.id,
    tenantId: t.tenant_id,
    tenantName: tenantMap.get(t.tenant_id) || 'Unknown',
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    customerEmail: customerMap.get(t.customer_id),
    assignedTo: t.assigned_to,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

// ============================================
// PHASE 6: WHITELABELING IMPLEMENTATIONS
// ============================================

function sanitizeSubdomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

async function setTenantSubdomain(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  tenantId: string,
  subdomain: string | null,
) {
  const { data: before } = await admin.from('tenants').select('name, subdomain').eq('id', tenantId).single();
  let clean: string | null = null;
  if (subdomain && subdomain.trim()) {
    clean = sanitizeSubdomain(subdomain);
    if (clean.length < 3) throw new Error('Subdomain zu kurz (min 3 Zeichen)');
    // check uniqueness
    const { data: existing } = await admin
      .from('tenants')
      .select('id')
      .eq('subdomain', clean)
      .neq('id', tenantId)
      .maybeSingle();
    if (existing) throw new Error(`Subdomain "${clean}" ist bereits vergeben`);
  }

  // Auto-provision / deprovision in Vercel (best effort)
  const vercelMessages: string[] = [];
  if (isVercelConfigured()) {
    // Remove previous subdomain if it existed and is changing
    if (before?.subdomain && before.subdomain !== clean) {
      const del = await vercelRemoveDomain(`${before.subdomain}.trackbliss.eu`);
      if (del.ok || del.status === 404) vercelMessages.push(`Alte Subdomain aus Vercel entfernt: ${before.subdomain}.trackbliss.eu`);
      else vercelMessages.push(`Warnung: Alte Vercel-Domain konnte nicht entfernt werden (${del.status})`);
    }
    if (clean) {
      const add = await vercelAddDomain(`${clean}.trackbliss.eu`);
      if (add.ok) {
        vercelMessages.push(`In Vercel registriert: ${clean}.trackbliss.eu`);
      } else if (add.status === 409) {
        vercelMessages.push(`In Vercel bereits vorhanden: ${clean}.trackbliss.eu`);
      } else {
        // eslint-disable-next-line no-explicit-any
        const errMsg = ((add.data as any)?.error?.message) || add.error || `Status ${add.status}`;
        throw new Error(`Vercel-API-Fehler: ${errMsg}`);
      }
    }
  } else {
    vercelMessages.push('Vercel-API nicht konfiguriert — manuelle Anlage in Vercel-Dashboard erforderlich');
  }

  await admin.from('tenants').update({ subdomain: clean }).eq('id', tenantId);
  await audit(admin, ctx, {
    action: 'set_tenant_subdomain',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: before?.name,
    changes: { subdomain: { before: before?.subdomain, after: clean }, vercel: vercelMessages },
  });
  return {
    subdomain: clean,
    fullHost: clean ? `${clean}.trackbliss.eu` : null,
    vercelStatus: vercelMessages.join(' · '),
    vercelConfigured: isVercelConfigured(),
  };
}

async function setCustomDomain(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  tenantId: string,
  domain: string | null,
) {
  const { data: before } = await admin.from('tenants').select('name, custom_domain').eq('id', tenantId).single();
  let clean: string | null = null;
  let token: string | null = null;
  if (domain && domain.trim()) {
    clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) throw new Error('Ungültiges Domain-Format');
    const { data: existing } = await admin
      .from('tenants')
      .select('id')
      .eq('custom_domain', clean)
      .neq('id', tenantId)
      .maybeSingle();
    if (existing) throw new Error(`Domain "${clean}" wird bereits verwendet`);
    token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  }

  // Auto-provision / deprovision in Vercel
  const vercelMessages: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vercelDomainInfo: any = null;
  if (isVercelConfigured()) {
    if (before?.custom_domain && before.custom_domain !== clean) {
      const del = await vercelRemoveDomain(before.custom_domain);
      if (del.ok || del.status === 404) vercelMessages.push(`Alte Custom-Domain aus Vercel entfernt: ${before.custom_domain}`);
    }
    if (clean) {
      const add = await vercelAddDomain(clean);
      if (add.ok) {
        vercelDomainInfo = add.data;
        vercelMessages.push(`In Vercel registriert: ${clean}`);
      } else if (add.status === 409) {
        vercelMessages.push(`In Vercel bereits vorhanden`);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errMsg = ((add.data as any)?.error?.message) || add.error || `Status ${add.status}`;
        throw new Error(`Vercel-API-Fehler: ${errMsg}`);
      }
    }
  }

  await admin
    .from('tenants')
    .update({
      custom_domain: clean,
      custom_domain_verified: false,
      custom_domain_verified_at: null,
      dns_verification_token: token,
    })
    .eq('id', tenantId);
  await audit(admin, ctx, {
    action: 'set_custom_domain',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: before?.name,
    changes: { customDomain: { before: before?.custom_domain, after: clean }, vercel: vercelMessages },
  });
  return {
    customDomain: clean,
    verificationToken: token,
    verificationHost: clean ? `_trackbliss-verification.${clean}` : null,
    instructions: clean ? [
      `CNAME    ${clean} → cname.vercel-dns.com`,
      `TXT      _trackbliss-verification.${clean} → ${token}`,
    ] : [],
    vercelStatus: vercelMessages.join(' · '),
    vercelConfigured: isVercelConfigured(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vercelVerification: (vercelDomainInfo as any)?.verification || null,
  };
}

async function verifyCustomDomain(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  tenantId: string,
) {
  const { data: t } = await admin
    .from('tenants')
    .select('name, custom_domain, dns_verification_token')
    .eq('id', tenantId)
    .single();
  if (!t?.custom_domain) throw new Error('Keine Custom Domain konfiguriert');
  if (!t?.dns_verification_token) throw new Error('Kein Verification Token vorhanden');

  // DNS-over-HTTPS lookup at Cloudflare
  const lookupHost = `_trackbliss-verification.${t.custom_domain}`;
  let verified = false;
  let error: string | null = null;
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(lookupHost)}&type=TXT`, {
      headers: { Accept: 'application/dns-json' },
    });
    const json = await res.json();
    // deno-lint-ignore no-explicit-any
    const records = (json?.Answer || []) as any[];
    const values = records
      .filter((r) => r.type === 16)
      .map((r) => (typeof r.data === 'string' ? r.data.replace(/^"|"$/g, '') : ''));
    verified = values.some((v) => v === t.dns_verification_token);
    if (!verified) error = `Kein TXT-Record mit dem erwarteten Token gefunden. Gefunden: ${values.join(', ') || 'nichts'}`;
  } catch (e) {
    error = `DNS-Lookup fehlgeschlagen: ${(e as Error).message}`;
  }

  await admin
    .from('tenants')
    .update({
      custom_domain_verified: verified,
      custom_domain_verified_at: verified ? new Date().toISOString() : null,
    })
    .eq('id', tenantId);

  await audit(admin, ctx, {
    action: 'verify_custom_domain',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: t.name,
    changes: { verified, error },
  });

  return { verified, domain: t.custom_domain, error };
}

async function updateWhitelabelConfig(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  tenantId: string,
  config: Record<string, unknown>,
) {
  const { data: before } = await admin
    .from('tenants')
    .select('name, whitelabel_config')
    .eq('id', tenantId)
    .single();
  const merged = { ...(before?.whitelabel_config || {}), ...(config || {}) };
  await admin.from('tenants').update({ whitelabel_config: merged }).eq('id', tenantId);
  await audit(admin, ctx, {
    action: 'update_whitelabel_config',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: before?.name,
    changes: { config },
  });
  return merged;
}

async function setTenantSmtp(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  params: Record<string, unknown>,
) {
  const tenantId = params.tenantId as string;
  // deno-lint-ignore no-explicit-any
  const payload: any = {
    tenant_id: tenantId,
    enabled: params.enabled ?? true,
    host: params.host,
    port: params.port ?? 465,
    username: params.username,
    from_address: params.fromAddress,
    from_name: params.fromName,
    use_tls: params.useTls ?? true,
    updated_at: new Date().toISOString(),
  };
  // only update password if provided (avoid clobbering with empty)
  if (params.password && String(params.password).length > 0) {
    // TODO: encrypt via pgsodium once extension is enabled. For now store as-is.
    // Risk acknowledged: pgsodium integration deferred until vault configured.
    payload.password_encrypted = params.password as string;
  }
  const { data, error } = await admin
    .from('tenant_smtp_config')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) throw error;
  await audit(admin, ctx, {
    action: 'set_tenant_smtp',
    targetType: 'tenant',
    targetId: tenantId,
    changes: {
      host: params.host,
      port: params.port,
      fromAddress: params.fromAddress,
      enabled: params.enabled ?? true,
    },
  });
  return {
    id: data.id,
    tenantId: data.tenant_id,
    enabled: data.enabled,
    host: data.host,
    port: data.port,
    username: data.username,
    fromAddress: data.from_address,
    fromName: data.from_name,
    useTls: data.use_tls,
    lastTestedAt: data.last_tested_at,
    lastTestResult: data.last_test_result,
  };
}

async function testTenantSmtp(
  admin: SupabaseAdmin,
  ctx: AuditContext,
  tenantId: string,
  testTo: string,
) {
  if (!testTo || !testTo.includes('@')) throw new Error('Ungültige Test-Adresse');
  const { data: cfg } = await admin
    .from('tenant_smtp_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!cfg) throw new Error('Keine SMTP-Config gefunden');
  let result = 'ok';
  try {
    // Dynamic import within Deno context
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');
    const client = new SMTPClient({
      connection: {
        hostname: cfg.host,
        port: cfg.port || 465,
        tls: cfg.use_tls !== false,
        auth: {
          username: cfg.username,
          password: cfg.password_encrypted || '',
        },
      },
    });
    await client.send({
      from: cfg.from_name ? `${cfg.from_name} <${cfg.from_address}>` : cfg.from_address,
      to: testTo,
      subject: `SMTP-Test von Trackbliss (${new Date().toLocaleString('de-DE')})`,
      content: `Dies ist eine Test-E-Mail, um deine SMTP-Config zu verifizieren.\n\nWenn du diese E-Mail siehst, funktioniert deine Konfiguration.\n\n— Trackbliss Admin`,
    });
    await client.close();
  } catch (e) {
    result = `error: ${(e as Error).message}`;
  }
  await admin
    .from('tenant_smtp_config')
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_result: result,
    })
    .eq('tenant_id', tenantId);
  await audit(admin, ctx, {
    action: 'test_tenant_smtp',
    targetType: 'tenant',
    targetId: tenantId,
    changes: { result, testTo },
  });
  return { ok: result === 'ok', result };
}

async function disableTenantSmtp(admin: SupabaseAdmin, ctx: AuditContext, tenantId: string) {
  await admin.from('tenant_smtp_config').update({ enabled: false }).eq('tenant_id', tenantId);
  await audit(admin, ctx, {
    action: 'disable_tenant_smtp',
    targetType: 'tenant',
    targetId: tenantId,
  });
}

// ============================================
// VERCEL API AUTO-PROVISION
// ============================================

const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID'); // optional for team accounts

interface VercelResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

async function vercelApi(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<VercelResult> {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, status: 0, error: 'VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured' };
  }
  const url = new URL(`https://api.vercel.com${path}`);
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep as text */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

async function vercelAddDomain(domain: string): Promise<VercelResult> {
  return vercelApi('POST', `/v10/projects/${VERCEL_PROJECT_ID}/domains`, { name: domain });
}

async function vercelRemoveDomain(domain: string): Promise<VercelResult> {
  return vercelApi('DELETE', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}`);
}

function isVercelConfigured(): boolean {
  return !!(VERCEL_API_TOKEN && VERCEL_PROJECT_ID);
}

// ============================================
// DSGVO DATA EXPORT
// ============================================

const EXPORT_TABLES = [
  'tenants', 'profiles', 'invitations', 'activity_log',
  'billing_subscriptions', 'billing_module_subscriptions', 'billing_credits',
  'billing_credit_transactions', 'billing_usage_logs', 'billing_invoices',
  'products', 'product_batches', 'product_components', 'product_packaging',
  'documents', 'document_folders', 'document_versions',
  'supply_chain_entries', 'suppliers', 'supplier_products', 'supplier_invitations',
  'rh_customers', 'rh_customer_profiles', 'rh_returns', 'rh_return_items',
  'rh_return_timeline', 'rh_tickets', 'rh_ticket_messages', 'rh_notifications',
  'rh_workflow_rules', 'rh_email_templates', 'rh_return_reasons',
  'wh_locations', 'wh_stock_levels', 'wh_stock_transactions',
  'wh_shipments', 'wh_shipment_items', 'wh_contacts', 'wh_packaging_types',
  'wh_packaging_transactions',
  'shopify_product_map', 'shopify_location_map', 'shopify_sync_log',
  'admin_tenant_notes',
];

async function exportTenantData(admin: SupabaseAdmin, ctx: AuditContext, tenantId: string) {
  const { data: tenant } = await admin.from('tenants').select('name, slug').eq('id', tenantId).single();
  // deno-lint-ignore no-explicit-any
  const bundle: Record<string, any> = {
    _meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: ctx.adminEmail,
      tenantId,
      tenantName: tenant?.name,
      tenantSlug: tenant?.slug,
      version: 1,
    },
  };

  let totalRows = 0;
  const perTable: Record<string, number> = {};
  for (const table of EXPORT_TABLES) {
    try {
      const { data, error } = await admin.from(table).select('*').eq('tenant_id', tenantId).limit(100000);
      if (error) {
        // Tables without tenant_id (e.g. master data) or that don't exist yet → silently skip
        bundle[table] = { _skipped: error.message };
        continue;
      }
      bundle[table] = data || [];
      perTable[table] = (data || []).length;
      totalRows += (data || []).length;
    } catch (e) {
      bundle[table] = { _error: (e as Error).message };
    }
  }
  bundle._meta.totalRows = totalRows;
  bundle._meta.perTable = perTable;

  await audit(admin, ctx, {
    action: 'export_tenant_data',
    targetType: 'tenant',
    targetId: tenantId,
    targetLabel: tenant?.name,
    changes: { totalRows, tables: Object.keys(perTable).length },
  });

  return bundle;
}
