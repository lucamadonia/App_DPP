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
  healthScore?: number;
  expectedNextOrderDays?: number;
  avgDaysBetweenOrders?: number;
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
    healthScore: row.health_score != null ? Number(row.health_score) : undefined,
    expectedNextOrderDays: row.expected_next_order_days ?? undefined,
    avgDaysBetweenOrders: row.avg_days_between_orders != null ? Number(row.avg_days_between_orders) : undefined,
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

// ============================================
// v2: PRODUCT AFFINITY
// ============================================

export interface ProductAffinity {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export async function getCustomerProductAffinity(customerId: string, limit = 5): Promise<ProductAffinity[]> {
  const { data, error } = await supabase.rpc('get_customer_product_affinity', { p_customer_id: customerId, p_limit: limit });
  if (error) { console.error('getCustomerProductAffinity:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    productId: r.product_id,
    productName: r.product_name,
    totalQuantity: Number(r.total_quantity),
    totalRevenue: Number(r.total_revenue),
    orderCount: Number(r.order_count),
  }));
}

// ============================================
// v2: LIFECYCLE FUNNEL
// ============================================

export interface LifecycleFunnelStage {
  stage: string;
  customerCount: number;
  revenueSum: number;
}

export async function getLifecycleFunnel(): Promise<LifecycleFunnelStage[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data, error } = await supabase.rpc('get_lifecycle_funnel', { p_tenant_id: tenantId });
  if (error) { console.error('getLifecycleFunnel:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    stage: r.stage,
    customerCount: Number(r.customer_count),
    revenueSum: Number(r.revenue_sum),
  }));
}

// ============================================
// v2: CUSTOMER METRICS (health, expected next order)
// ============================================

export async function refreshCustomerMetrics(customerId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_customer_metrics', { p_customer_id: customerId });
  if (error) console.error('refreshCustomerMetrics:', error);
}

export async function refreshTenantHealthScores(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return 0;
  const { data, error } = await supabase.rpc('compute_rfm_and_health', { p_tenant_id: tenantId });
  if (error) { console.error('compute_rfm_and_health:', error); return 0; }
  return Number(data) || 0;
}

export interface ChurnPrediction {
  /** Tage bis erwartete nächste Bestellung; negativ = überfällig */
  daysUntilExpected: number | null;
  /** Tage seit letzter Bestellung */
  daysSinceLast: number | null;
  /** Durchschnitt Tage zwischen Bestellungen */
  avgGap: number | null;
  /** true wenn überfällig */
  isOverdue: boolean;
  /** 'healthy' | 'due' | 'overdue' | 'unknown' */
  state: 'healthy' | 'due' | 'overdue' | 'unknown';
}

export function deriveChurnPrediction(c: CrmCustomer): ChurnPrediction {
  const avgGap = c.avgDaysBetweenOrders ?? null;
  const daysSinceLast = c.lastOrderAt
    ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysUntilExpected = c.expectedNextOrderDays ?? null;

  let state: ChurnPrediction['state'] = 'unknown';
  let isOverdue = false;
  if (avgGap == null || daysSinceLast == null) {
    state = 'unknown';
  } else {
    // Overdue = past 120% of average gap
    isOverdue = daysSinceLast > avgGap * 1.2;
    if (isOverdue) state = 'overdue';
    else if (daysSinceLast > avgGap * 0.8) state = 'due';
    else state = 'healthy';
  }
  return { daysUntilExpected, daysSinceLast, avgGap, isOverdue, state };
}

// ============================================
// v2: NOTES
// ============================================

export interface CustomerNote {
  id: string;
  customerId: string;
  authorId?: string;
  authorName?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformNote(r: any): CustomerNote {
  return {
    id: r.id,
    customerId: r.customer_id,
    authorId: r.author_id || undefined,
    authorName: r.author_name || undefined,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from('rh_customer_notes')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getCustomerNotes:', error); return []; }
  return (data || []).map(transformNote);
}

export async function addCustomerNote(customerId: string, content: string, authorName?: string): Promise<CustomerNote | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId || !content.trim()) return null;
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('rh_customer_notes')
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      author_id: auth?.user?.id || null,
      author_name: authorName || auth?.user?.email || null,
      content: content.trim(),
    })
    .select()
    .single();
  if (error) { console.error('addCustomerNote:', error); return null; }
  return transformNote(data);
}

export async function updateCustomerNote(noteId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('rh_customer_notes')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', noteId);
  if (error) console.error('updateCustomerNote:', error);
}

export async function deleteCustomerNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('rh_customer_notes').delete().eq('id', noteId);
  if (error) console.error('deleteCustomerNote:', error);
}

// ============================================
// v2: TAGS
// ============================================

export async function updateCustomerTags(customerId: string, tags: string[]): Promise<void> {
  const { error } = await supabase
    .from('rh_customers')
    .update({ tags: Array.from(new Set(tags.map(t => t.trim()).filter(Boolean))) })
    .eq('id', customerId);
  if (error) throw error;
}

export async function getTenantTagVocabulary(): Promise<string[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data } = await supabase.from('rh_customers').select('tags').eq('tenant_id', tenantId).limit(1000);
  const set = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data || []).forEach((r: any) => (r.tags || []).forEach((t: string) => set.add(t)));
  return Array.from(set).sort();
}

export async function bulkAddTag(customerIds: string[], tag: string): Promise<number> {
  const clean = tag.trim();
  if (!clean || customerIds.length === 0) return 0;
  let updated = 0;
  for (const id of customerIds) {
    const { data: row } = await supabase.from('rh_customers').select('tags').eq('id', id).maybeSingle();
    const existing: string[] = row?.tags || [];
    if (existing.includes(clean)) continue;
    const { error } = await supabase.from('rh_customers').update({ tags: [...existing, clean] }).eq('id', id);
    if (!error) updated++;
  }
  return updated;
}

// ============================================
// v2: CSV EXPORT
// ============================================

export function customersToCSV(customers: CrmCustomer[]): string {
  const rows: string[][] = [
    ['ID', 'Email', 'Vorname', 'Nachname', 'Firma', 'Telefon', 'Bestellungen', 'CLV', 'Ø Bestellwert', 'RFM-Segment', 'Health-Score', 'Letzte Bestellung', 'Erste Bestellung', 'Tags', 'Shopify-ID', 'Angelegt'],
  ];
  for (const c of customers) {
    rows.push([
      c.id,
      c.email || '',
      c.firstName || '',
      c.lastName || '',
      c.company || '',
      c.phone || '',
      String(c.totalOrders),
      c.totalSpent.toFixed(2),
      c.avgOrderValue.toFixed(2),
      c.rfmSegment || '',
      c.healthScore != null ? String(c.healthScore) : '',
      c.lastOrderAt || '',
      c.firstOrderAt || '',
      (c.tags || []).join('|'),
      c.shopifyCustomerId ? String(c.shopifyCustomerId) : '',
      c.createdAt,
    ]);
  }
  return rows
    .map(r => r.map(cell => {
      const str = String(cell ?? '');
      return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(';'))
    .join('\r\n');
}

// ============================================
// v2: HEALTH SCORE DISTRIBUTION
// ============================================

export interface HealthDistribution {
  range: string;
  min: number;
  max: number;
  count: number;
}

export async function getHealthDistribution(): Promise<HealthDistribution[]> {
  const tenantId = await getCurrentTenantId();
  const buckets: HealthDistribution[] = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '20-40', min: 20, max: 40, count: 0 },
    { range: '40-60', min: 40, max: 60, count: 0 },
    { range: '60-80', min: 60, max: 80, count: 0 },
    { range: '80-100', min: 80, max: 101, count: 0 },
  ];
  if (!tenantId) return buckets;
  const { data } = await supabase
    .from('rh_customers')
    .select('health_score')
    .eq('tenant_id', tenantId)
    .not('health_score', 'is', null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data || []).forEach((r: any) => {
    const score = Number(r.health_score);
    const bucket = buckets.find(b => score >= b.min && score < b.max);
    if (bucket) bucket.count++;
  });
  return buckets;
}
