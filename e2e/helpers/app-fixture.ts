import type { BrowserContext } from '@playwright/test';

export const fixtureId = '00000000-0000-4000-8000-000000000001';
const tenantId = '00000000-0000-4000-8000-000000000002';
const createdAt = '2026-11-01T08:00:00Z';

/** Isolated UI fixtures: every external request is intercepted, never forwarded. */
export async function installAppFixture(context: BrowserContext) {
  const user = { id: fixtureId, aud: 'authenticated', role: 'authenticated', email: 'mobile-qa@example.invalid', user_metadata: { name: 'Mobile QA' }, app_metadata: { provider: 'email' }, created_at: createdAt };
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: fixtureId, aud: 'authenticated', role: 'authenticated', exp: expires }].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.') + '.isolated-fixture';
  const session = { access_token: token, refresh_token: 'local-only', token_type: 'bearer', expires_at: expires, expires_in: 86400, user };
  const product = { id: fixtureId, tenant_id: tenantId, name: 'Reisetasche mit einem besonders langen Produktnamen', manufacturer: 'Mobile QA', gtin: '4006381333931', serial_number: 'QA-001', category: 'Textiles', description: 'Isolierte Beispieldaten für mobile Ansichten.', status: 'live', created_at: createdAt, updated_at: createdAt, materials: [], certifications: [], product_batches: [], product_components: [] };
  const rows: Record<string, unknown> = {
    user, token: session,
    profiles: [{ id: fixtureId, tenant_id: tenantId, email: user.email, full_name: 'Mobile QA', role: 'admin', is_super_admin: true, admin_role: 'super_admin' }],
    tenants: [{ id: tenantId, name: 'Mobiles Beispielunternehmen', slug: 'mobile-qa', settings: {}, created_at: createdAt }],
    billing_subscriptions: [{ tenant_id: tenantId, plan: 'enterprise', status: 'active' }],
    billing_module_subscriptions: ['returns_hub_business', 'warehouse_business', 'commerce_hub_business', 'feedback_business'].map(module_id => ({ module_id, status: 'active' })),
    billing_credits: [{ monthly_allowance: 1000, monthly_used: 0, purchased_balance: 1000 }],
    products: [product],
    product_batches: [{ id: fixtureId, product_id: fixtureId, serial_number: 'QA-BATCH', production_date: '2026-11-01', status: 'live', quantity: 20, created_at: createdAt, products: product }],
    countries: [{ id: fixtureId, code: 'DE', name: 'Germany', name_de: 'Deutschland', alpha2: 'DE', is_active: true, authorities: [], regulations: 0, checklists: 0, flag: '🇩🇪', description: 'Isolierte Länderinformationen' }],
    wh_locations: [{ id: fixtureId, tenant_id: tenantId, name: 'Beispiellager', code: 'QA', type: 'warehouse', is_active: true, zones: [], created_at: createdAt }],
    wh_stock_levels: [{ id: fixtureId, tenant_id: tenantId, product_id: fixtureId, batch_id: fixtureId, location_id: fixtureId, quantity_available: 20, quantity_reserved: 0, products: product }],
    wh_shipments: [{ id: fixtureId, tenant_id: tenantId, shipment_number: 'SHP-20261108-QA1234', status: 'draft', recipient_type: 'customer', recipient_name: 'Testperson mit langem Empfängernamen', shipping_street: 'Beispielstrasse 123', shipping_city: 'Berlin', shipping_postal_code: '12345', shipping_country: 'DE', total_items: 2, priority: 'normal', created_at: createdAt, updated_at: createdAt }],
    wh_shipment_items: [{ id: fixtureId, tenant_id: tenantId, shipment_id: fixtureId, product_id: fixtureId, location_id: fixtureId, batch_id: fixtureId, quantity: 2, quantity_picked: 0, quantity_packed: 0, unit_price: 25.99, currency: 'EUR', products: product }],
  };

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (!url.hostname.endsWith('supabase.co')) return route.abort();
    const resource = url.pathname.split('/').at(-1) ?? '';
    let result = rows[resource] ?? [];
    if (resource === 'admin-api') {
      const operation = route.request().postDataJSON()?.operation;
      result = { success: true, data: operation === 'get_platform_stats'
        ? { totalTenants: 0, totalUsers: 0, totalProducts: 0, activeReturns: 0, paidTenants: 0, mrr: 0, recentSignups7d: 0, aiCreditsUsedMonth: 0, planDistribution: { free: 0, pro: 0, enterprise: 0 } }
        : [] };
      if (operation === 'list_audit_log') result = { success: true, data: { entries: [], total: 0 } };
      if (operation === 'get_tenant') result = { success: true, data: {
        id: tenantId, name: 'Mobiles Beispielunternehmen', slug: 'mobile-qa', createdAt,
        address: null, country: 'DE', eori: null, vat: null, stripeCustomerId: null,
        plan: 'enterprise', activeModules: [], userCount: 1, productCount: 1,
        monthlyAllowance: 1000, monthlyUsed: 0, purchasedBalance: 1000,
        settings: {}, users: [], creditTransactions: [], invoices: [],
        usage: { products: 1, documents: 0, adminUsers: 1, returns: 0, tickets: 0, suppliers: 0 },
      } };
    }
    const single = route.request().headers().accept?.includes('object+json');
    const body = single && Array.isArray(result) ? result[0] ?? null : result;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': `0-0/${Array.isArray(result) ? result.length : 1}` }, body: route.request().method() === 'HEAD' ? '' : JSON.stringify(body) });
  });
  await context.addInitScript(({ session }) => {
    for (const ref of ['xbnybrqzsjlbieqlwsas', 'placeholder']) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
    localStorage.setItem('dpp-language', 'de');
  }, { session });
}
