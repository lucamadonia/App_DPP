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

    // Check is_super_admin
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return jsonResponse({ success: false, error: 'Forbidden: Super admin required' }, 403);
    }

    // Parse request
    const body: AdminApiRequest = await req.json();
    const { operation, params = {} } = body;

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
