/**
 * CRM Analytics Service
 *
 * Smart Customer-360 Features:
 *   - getCustomerList: Filter + Sort über RFM/Lifecycle/Tags/CLV-Range
 *   - getCustomerDetail: 360°-Daten inkl. Aggregate + Timeline-Counts
 *   - getCustomerTimeline: chronologisch Shipments + Returns + Tickets + Notifications
 *   - getCustomerCLVTrend: monatliche Revenue-Trend-Daten für Line-Chart
 *   - getTopCustomers / getAtRiskCustomers: vorgefertigte Segment-Listen
 *   - getTenantCRMKPIs: Dashboard-KPIs
 *   - refreshCustomerStats / refreshTenantRFMScores: DB-Function-Wrapper
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

export type RfmSegment = 'champion' | 'loyal' | 'potential' | 'new' | 'at_risk' | 'hibernating' | 'lost';

export interface CrmCustomer {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  shopifyCustomerId?: number;
  tags: string[];
  riskScore: number;
  lifecycleStage?: string;
  satisfactionScore?: number;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  rfmRecencyScore?: number;
  rfmFrequencyScore?: number;
  rfmMonetaryScore?: number;
  rfmCombinedScore?: number;
  rfmSegment?: RfmSegment;
  statsRefreshedAt?: string;
  createdAt: string;
}

export interface CustomerListFilter {
  search?: string;
  rfmSegments?: RfmSegment[];
  lifecycleStages?: string[];
  tags?: string[];
  clvMin?: number;
  clvMax?: number;
  hasShopifyId?: boolean;
  sortBy?: 'total_spent' | 'total_orders' | 'last_order_at' | 'created_at' | 'avg_order_value';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCustomer(row: any): CrmCustomer {
  return {
    id: row.id,
    email: row.email || undefined,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    company: row.company || undefined,
    phone: row.phone || undefined,
    shopifyCustomerId: row.shopify_customer_id ?? undefined,
    tags: row.tags || [],
    riskScore: row.risk_score ?? 0,
    lifecycleStage: row.lifecycle_stage || undefined,
    satisfactionScore: row.satisfaction_score != null ? Number(row.satisfaction_score) : undefined,
    totalOrders: row.total_orders ?? 0,
    totalSpent: row.total_spent != null ? Number(row.total_spent) : 0,
    avgOrderValue: row.avg_order_value != null ? Number(row.avg_order_value) : 0,
    firstOrderAt: row.first_order_at || undefined,
    lastOrderAt: row.last_order_at || undefined,
    rfmRecencyScore: row.rfm_recency_score ?? undefined,
    rfmFrequencyScore: row.rfm_frequency_score ?? undefined,
    rfmMonetaryScore: row.rfm_monetary_score ?? undefined,
    rfmCombinedScore: row.rfm_combined_score ?? undefined,
    rfmSegment: row.rfm_segment || undefined,
    statsRefreshedAt: row.stats_refreshed_at || undefined,
    createdAt: row.created_at,
  };
}

// ============================================
// LIST + DETAIL
// ============================================

export async function getCustomerList(filter: CustomerListFilter = {}): Promise<{ data: CrmCustomer[]; total: number }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0 };

  const page = filter.page || 1;
  const pageSize = filter.pageSize || 25;

  let q = supabase.from('rh_customers').select('*', { count: 'exact' }).eq('tenant_id', tenantId);
  if (filter.search) {
    q = q.or(`email.ilike.%${filter.search}%,first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%,company.ilike.%${filter.search}%`);
  }
  if (filter.rfmSegments?.length) q = q.in('rfm_segment', filter.rfmSegments);
  if (filter.lifecycleStages?.length) q = q.in('lifecycle_stage', filter.lifecycleStages);
  if (filter.tags?.length) q = q.overlaps('tags', filter.tags);
  if (filter.clvMin != null) q = q.gte('total_spent', filter.clvMin);
  if (filter.clvMax != null) q = q.lte('total_spent', filter.clvMax);
  if (filter.hasShopifyId === true) q = q.not('shopify_customer_id', 'is', null);
  if (filter.hasShopifyId === false) q = q.is('shopify_customer_id', null);

  const sortCol = filter.sortBy || 'last_order_at';
  const ascending = filter.sortDir === 'asc';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await q.order(sortCol, { ascending, nullsFirst: false }).range(from, to);
  if (error) { console.error('getCustomerList failed:', error); return { data: [], total: 0 }; }
  return { data: (data || []).map(transformCustomer), total: count || 0 };
}

export async function getCustomerDetail(id: string): Promise<CrmCustomer | null> {
  const { data } = await supabase.from('rh_customers').select('*').eq('id', id).maybeSingle();
  return data ? transformCustomer(data) : null;
}

// ============================================
// TIMELINE (Shipments + Returns + Tickets + Notifications)
// ============================================

export interface TimelineEvent {
  id: string;
  type: 'shipment' | 'return' | 'ticket' | 'notification';
  title: string;
  description?: string;
  status?: string;
  amount?: number;
  timestamp: string;
  deepLink?: string;
}

export async function getCustomerTimeline(customerId: string): Promise<TimelineEvent[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const [shipments, returns, tickets, notifications] = await Promise.all([
    supabase.from('wh_shipments').select('id, shipment_number, status, total_items, created_at, order_reference').eq('tenant_id', tenantId).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
    supabase.from('rh_returns').select('id, return_number, status, refund_amount, created_at').eq('tenant_id', tenantId).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
    supabase.from('rh_tickets').select('id, subject, status, priority, created_at').eq('tenant_id', tenantId).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
    supabase.from('rh_notifications').select('id, channel, template, subject, status, sent_at, created_at').eq('tenant_id', tenantId).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
  ]);

  const events: TimelineEvent[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (shipments.data || []).forEach((s: any) => events.push({
    id: `ship-${s.id}`,
    type: 'shipment',
    title: `Bestellung ${s.shipment_number}`,
    description: s.order_reference ? `${s.order_reference} · ${s.total_items} Positionen · Status: ${s.status}` : `${s.total_items} Positionen · Status: ${s.status}`,
    status: s.status,
    timestamp: s.created_at,
    deepLink: `/warehouse/shipments/${s.id}`,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (returns.data || []).forEach((r: any) => events.push({
    id: `ret-${r.id}`,
    type: 'return',
    title: `Retoure ${r.return_number || r.id.slice(0,8)}`,
    description: `Status: ${r.status}${r.refund_amount ? ` · Erstattung: ${r.refund_amount} EUR` : ''}`,
    status: r.status,
    amount: r.refund_amount ? Number(r.refund_amount) : undefined,
    timestamp: r.created_at,
    deepLink: `/returns/${r.id}`,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tickets.data || []).forEach((t: any) => events.push({
    id: `tkt-${t.id}`,
    type: 'ticket',
    title: `Ticket: ${t.subject || '(ohne Betreff)'}`,
    description: `Priorität: ${t.priority} · Status: ${t.status}`,
    status: t.status,
    timestamp: t.created_at,
    deepLink: `/returns/tickets/${t.id}`,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (notifications.data || []).forEach((n: any) => events.push({
    id: `not-${n.id}`,
    type: 'notification',
    title: `${n.channel === 'email' ? 'E-Mail' : n.channel}: ${n.subject || n.template}`,
    description: `Status: ${n.status}`,
    status: n.status,
    timestamp: n.sent_at || n.created_at,
  }));

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ============================================
// CLV TREND (für Line-Chart)
// ============================================

export async function getCustomerCLVTrend(customerId: string, months = 12): Promise<{ month: string; revenue: number; orders: number }[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  // Hole alle Shipments + Items dieses Customers
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select('id, created_at, status')
    .eq('tenant_id', tenantId)
    .eq('customer_id', customerId)
    .gte('created_at', since.toISOString())
    .neq('status', 'cancelled');

  if (!shipments?.length) return [];

  const shipIds = shipments.map(s => s.id);
  const { data: items } = await supabase
    .from('wh_shipment_items')
    .select('shipment_id, quantity, unit_price')
    .in('shipment_id', shipIds);

  // Per Shipment Revenue summieren
  const revByShip: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (items || []).forEach((it: any) => {
    revByShip[it.shipment_id] = (revByShip[it.shipment_id] || 0) + (it.quantity * (Number(it.unit_price) || 0));
  });

  // Monatlich gruppieren
  const byMonth: Record<string, { revenue: number; orders: number }> = {};
  shipments.forEach(s => {
    const month = s.created_at.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { revenue: 0, orders: 0 };
    byMonth[month].revenue += revByShip[s.id] || 0;
    byMonth[month].orders += 1;
  });

  // Fülle leere Monate auf (für Chart-Continuity)
  const result: { month: string; revenue: number; orders: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, revenue: byMonth[key]?.revenue ?? 0, orders: byMonth[key]?.orders ?? 0 });
  }
  return result;
}

// ============================================
// REFRESH / RECOMPUTE
// ============================================

export async function refreshCustomerStats(customerId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_customer_stats', { p_customer_id: customerId });
  if (error) console.error('refreshCustomerStats failed:', error);
}

export async function refreshTenantRFMScores(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return 0;
  const { data, error } = await supabase.rpc('compute_rfm_scores', { p_tenant_id: tenantId });
  if (error) { console.error('refreshTenantRFMScores failed:', error); return 0; }
  return (data as number) ?? 0;
}

// ============================================
// TOP LISTS
// ============================================

export async function getTopCustomers(limit = 10): Promise<CrmCustomer[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .gt('total_orders', 0)
    .order('total_spent', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data || []).map(transformCustomer);
}

export async function getAtRiskCustomers(limit = 10): Promise<CrmCustomer[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('rfm_segment', ['at_risk', 'hibernating'])
    .order('total_spent', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data || []).map(transformCustomer);
}

// ============================================
// TENANT-LEVEL KPIs (für CRM-Dashboard)
// ============================================

export interface CrmKPIs {
  totalCustomers: number;
  customersWithOrders: number;
  totalRevenue: number;
  avgCLV: number;
  medianCLV: number;
  vipCount: number;      // rfm_segment = 'champion'
  atRiskCount: number;   // rfm_segment = 'at_risk'
  newLast30d: number;    // created_at >= 30 Tage
  segmentBreakdown: Record<string, number>;
}

export async function getTenantCRMKPIs(): Promise<CrmKPIs> {
  const tenantId = await getCurrentTenantId();
  const empty: CrmKPIs = { totalCustomers: 0, customersWithOrders: 0, totalRevenue: 0, avgCLV: 0, medianCLV: 0, vipCount: 0, atRiskCount: 0, newLast30d: 0, segmentBreakdown: {} };
  if (!tenantId) return empty;

  const { data } = await supabase
    .from('rh_customers')
    .select('total_spent, total_orders, rfm_segment, created_at')
    .eq('tenant_id', tenantId);
  if (!data?.length) return empty;

  const kpis = { ...empty };
  kpis.totalCustomers = data.length;
  const thirty = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const spentValues: number[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.forEach((c: any) => {
    const spent = Number(c.total_spent || 0);
    kpis.totalRevenue += spent;
    if ((c.total_orders || 0) > 0) { kpis.customersWithOrders++; spentValues.push(spent); }
    if (c.rfm_segment === 'champion') kpis.vipCount++;
    if (c.rfm_segment === 'at_risk' || c.rfm_segment === 'hibernating') kpis.atRiskCount++;
    if (new Date(c.created_at).getTime() > thirty) kpis.newLast30d++;
    const seg = c.rfm_segment || 'unassigned';
    kpis.segmentBreakdown[seg] = (kpis.segmentBreakdown[seg] || 0) + 1;
  });
  kpis.avgCLV = kpis.customersWithOrders > 0 ? kpis.totalRevenue / kpis.customersWithOrders : 0;
  spentValues.sort((a, b) => a - b);
  kpis.medianCLV = spentValues.length ? spentValues[Math.floor(spentValues.length / 2)] : 0;
  return kpis;
}

// ============================================
// SHOPIFY DEEP-LINK HELPER
// ============================================

export function buildShopifyCustomerLink(shopDomain: string | undefined, shopifyCustomerId: number | undefined): string | null {
  if (!shopDomain || !shopifyCustomerId) return null;
  return `https://${shopDomain.replace('.myshopify.com', '')}.myshopify.com/admin/customers/${shopifyCustomerId}`;
}

// ============================================
// NEXT-BEST-ACTION Helper (client-side derivation)
// ============================================

export interface NextAction {
  label: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

export function suggestNextAction(c: CrmCustomer): NextAction {
  switch (c.rfmSegment) {
    case 'champion':
      return { label: 'VIP-Dankeschön senden', description: 'Top-10% Kunde — exklusiver Gruß oder Early-Access-Angebot', urgency: 'low' };
    case 'loyal':
      return { label: 'Loyalty-Belohnung anbieten', description: 'Treuer Wiederkäufer — Rabatt-Code oder Bundle-Angebot', urgency: 'low' };
    case 'at_risk':
      return { label: 'Re-Engagement-Mail', description: 'War wertvoll, aber meldet sich seit Längerem nicht — jetzt mit 10 % Rabatt zurückholen', urgency: 'high' };
    case 'hibernating':
      return { label: 'Win-Back-Kampagne', description: 'Lange inaktiv — größerer Anreiz, z.B. 15–20 % Rabatt', urgency: 'medium' };
    case 'lost':
      return { label: 'Letzter Versuch', description: 'Verloren — starker Anreiz (free shipping + Rabatt) oder Kontakte archivieren', urgency: 'medium' };
    case 'new':
      return { label: 'Willkommens-Journey', description: 'Neuer Kunde — Produkt-Education-E-Mail-Sequenz starten', urgency: 'medium' };
    case 'potential':
      return { label: 'Bewegen zu loyal', description: 'Zeigt Potenzial — zweite Bestellung fördern mit Produkt-Empfehlungen', urgency: 'medium' };
    default:
      return { label: 'Kontakt aufnehmen', description: 'Noch kein Segment berechnet — RFM-Score nach nächstem Cron-Lauf verfügbar', urgency: 'low' };
  }
}
