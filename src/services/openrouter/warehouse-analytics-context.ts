/**
 * Warehouse AI – Analytics Context
 *
 * Builds pre-aggregated, complete (not sampled) statistics for the
 * warehouse AI chat so it can answer questions like
 * "how many units did we sell", "how many parcels / kg did we ship",
 * "how much packaging per LUCID material" with exact numbers.
 *
 * All queries are tenant-scoped and paginated past the 1000-row
 * PostgREST default. Each block fails soft (empty string) so one missing
 * table never breaks the whole chat context.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

const PAGE = 1000;
/** Safety cap so a huge tenant cannot stall the chat (rows per table). */
const MAX_ROWS = 50_000;
const MONTHS = 12;

type Row = Record<string, unknown>;

/** Fetch all rows of a query by paging with .range(). */
async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const month = (iso: unknown): string => (typeof iso === 'string' ? iso.slice(0, 7) : '—');
const fmt = (n: number, digits = 0) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const kg = (grams: number) => fmt(grams / 1000, 2);

function startOfMonthsAgo(n: number): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1), 1));
}

function bump<K>(map: Map<K, number>, key: K, by: number) {
  map.set(key, (map.get(key) || 0) + by);
}

function topRows(map: Map<string, number>, limit = 20): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// ─── Sales (commerce orders) ─────────────────────────────────

async function buildSalesBlock(tenantId: string): Promise<string> {
  const orders = await fetchAll((f, t) =>
    supabase
      .from('commerce_orders')
      .select('id, platform, total_amount, total_amount_eur, customer_country, order_status, placed_at, is_test')
      .eq('tenant_id', tenantId)
      .order('placed_at', { ascending: false })
      .range(f, t),
  );
  const real = orders.filter(o => !o.is_test && o.order_status !== 'cancelled');
  if (real.length === 0) return '## Verkäufe\nKeine (nicht-Test-)Bestellungen vorhanden.';

  const placedById = new Map(real.map(o => [o.id as string, o.placed_at as string]));
  const items = (await fetchAll((f, t) =>
    supabase
      .from('commerce_order_items')
      .select('order_id, title, sku, quantity, total_price')
      .eq('tenant_id', tenantId)
      .range(f, t),
  )).filter(i => placedById.has(i.order_id as string));

  const revenue = (o: Row) => num(o.total_amount_eur ?? o.total_amount);
  const d30 = Date.now() - 30 * 86_400_000;
  const since12 = startOfMonthsAgo(MONTHS).getTime();

  const byMonth = new Map<string, { orders: number; units: number; revenue: number }>();
  const byCountry = new Map<string, number>();
  const byPlatform = new Map<string, number>();
  let totalRevenue = 0;
  for (const o of real) {
    totalRevenue += revenue(o);
    bump(byCountry, (o.customer_country as string) || '—', 1);
    bump(byPlatform, (o.platform as string) || '—', 1);
    if (new Date(o.placed_at as string).getTime() >= since12) {
      const m = month(o.placed_at);
      const e = byMonth.get(m) || { orders: 0, units: 0, revenue: 0 };
      e.orders += 1;
      e.revenue += revenue(o);
      byMonth.set(m, e);
    }
  }

  const perProduct = new Map<string, { all: number; d30: number; m12: number; revenue: number }>();
  let totalUnits = 0;
  for (const i of items) {
    const qty = num(i.quantity);
    totalUnits += qty;
    const key = `${i.title as string}${i.sku ? ` (SKU ${i.sku as string})` : ''}`;
    const e = perProduct.get(key) || { all: 0, d30: 0, m12: 0, revenue: 0 };
    const placedIso = placedById.get(i.order_id as string);
    const placed = new Date(placedIso || 0).getTime();
    e.all += qty;
    e.revenue += num(i.total_price);
    if (placed >= d30) e.d30 += qty;
    if (placed >= since12) {
      e.m12 += qty;
      const mm = byMonth.get(month(placedIso));
      if (mm) mm.units += qty;
    }
    perProduct.set(key, e);
  }

  return [
    '## Verkäufe (alle Bestellungen, ohne Test/Storno)',
    `- Bestellungen gesamt: ${fmt(real.length)} · verkaufte Stück gesamt: ${fmt(totalUnits)} · Umsatz gesamt: ${fmt(totalRevenue, 2)} EUR`,
    `- Zeitraum: ${month(real[real.length - 1].placed_at)} bis ${month(real[0].placed_at)}`,
    '',
    '### Verkaufte Stück pro Produkt',
    '| Produkt | Stück gesamt | Stück letzte 30 Tage | Stück letzte 12 Monate | Umsatz EUR |',
    '|---------|--------------|----------------------|------------------------|------------|',
    ...[...perProduct.entries()]
      .sort((a, b) => b[1].all - a[1].all)
      .slice(0, 100)
      .map(([name, e]) => `| ${name} | ${fmt(e.all)} | ${fmt(e.d30)} | ${fmt(e.m12)} | ${fmt(e.revenue, 2)} |`),
    '',
    `### Verkäufe pro Monat (letzte ${MONTHS} Monate)`,
    '| Monat | Bestellungen | Stück | Umsatz EUR |',
    '|-------|--------------|-------|------------|',
    ...[...byMonth.entries()].sort().map(([m, e]) => `| ${m} | ${fmt(e.orders)} | ${fmt(e.units)} | ${fmt(e.revenue, 2)} |`),
    '',
    '### Bestellungen nach Land',
    ...topRows(byCountry).map(([c, n]) => `- ${c}: ${fmt(n)}`),
    '',
    '### Bestellungen nach Kanal',
    ...topRows(byPlatform).map(([p, n]) => `- ${p}: ${fmt(n)}`),
  ].join('\n');
}

// ─── Shipments ───────────────────────────────────────────────

async function buildShipmentsBlock(tenantId: string): Promise<string> {
  const shipments = await fetchAll((f, t) =>
    supabase
      .from('wh_shipments')
      .select('id, status, carrier, shipping_country, total_weight_grams, total_items, shipping_cost, shipped_at, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .range(f, t),
  );
  if (shipments.length === 0) return '## Versand-Auswertung\nKeine Sendungen vorhanden.';

  const date = (s: Row) => (s.shipped_at as string) || (s.created_at as string);
  const since12 = startOfMonthsAgo(MONTHS).getTime();
  const byMonth = new Map<string, { count: number; items: number; grams: number; cost: number }>();
  const byStatus = new Map<string, number>();
  const byCarrier = new Map<string, number>();
  const byCountry = new Map<string, number>();
  let grams = 0, itemsTotal = 0, cost = 0, withoutWeight = 0;

  for (const s of shipments) {
    const g = num(s.total_weight_grams);
    if (!g) withoutWeight++;
    grams += g;
    itemsTotal += num(s.total_items);
    cost += num(s.shipping_cost);
    bump(byStatus, (s.status as string) || '—', 1);
    bump(byCarrier, (s.carrier as string) || '—', 1);
    bump(byCountry, (s.shipping_country as string) || '—', 1);
    if (new Date(date(s)).getTime() >= since12) {
      const m = month(date(s));
      const e = byMonth.get(m) || { count: 0, items: 0, grams: 0, cost: 0 };
      e.count += 1; e.items += num(s.total_items); e.grams += g; e.cost += num(s.shipping_cost);
      byMonth.set(m, e);
    }
  }

  // Shipped units per product
  const ids = shipments.map(s => s.id as string);
  const perProduct = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from('wh_shipment_items')
      .select('quantity, products(name)')
      .in('shipment_id', ids.slice(i, i + 200));
    for (const r of (data || []) as Row[]) {
      const p = r.products as { name?: string } | { name?: string }[] | null;
      const name = (Array.isArray(p) ? p[0]?.name : p?.name) || 'Unbekannt';
      bump(perProduct, name, num(r.quantity));
    }
  }

  return [
    '## Versand-Auswertung (alle Sendungen, ohne Storno)',
    `- Sendungen/Pakete gesamt: ${fmt(shipments.length)} · Artikel gesamt: ${fmt(itemsTotal)} · Gesamtgewicht: ${kg(grams)} kg · Versandkosten: ${fmt(cost, 2)} EUR`,
    withoutWeight ? `- Hinweis: ${fmt(withoutWeight)} Sendungen ohne erfasstes Gewicht (in kg-Summen als 0 gezählt).` : '',
    '',
    `### Versand pro Monat (letzte ${MONTHS} Monate, nach Versanddatum)`,
    '| Monat | Sendungen | Artikel | Gewicht kg | Versandkosten EUR |',
    '|-------|-----------|---------|------------|-------------------|',
    ...[...byMonth.entries()].sort().map(([m, e]) => `| ${m} | ${fmt(e.count)} | ${fmt(e.items)} | ${kg(e.grams)} | ${fmt(e.cost, 2)} |`),
    '',
    '### Versendete Stück pro Produkt',
    ...topRows(perProduct, 100).map(([n, q]) => `- ${n}: ${fmt(q)}`),
    '',
    '### Sendungen nach Status',
    ...topRows(byStatus).map(([k, n]) => `- ${k}: ${fmt(n)}`),
    '### Sendungen nach Carrier',
    ...topRows(byCarrier).map(([k, n]) => `- ${k}: ${fmt(n)}`),
    '### Sendungen nach Zielland',
    ...topRows(byCountry).map(([k, n]) => `- ${k}: ${fmt(n)}`),
  ].filter(l => l !== '').join('\n');
}

// ─── Packaging / LUCID ───────────────────────────────────────

async function buildPackagingBlock(): Promise<string> {
  const { getPackagingUsage } = await import('@/services/supabase/wh-packaging-usage');
  const from = startOfMonthsAgo(MONTHS).toISOString();
  const to = new Date().toISOString();
  const usage = await getPackagingUsage({ from, to });
  if (usage.totals.shipmentCount === 0) return '## Verpackungsverbrauch / LUCID\nKein Verpackungsverbrauch im Zeitraum.';

  const byMonth = new Map<string, { outer: number; product: number }>();
  for (const p of usage.timeline) {
    const e = byMonth.get(p.date.slice(0, 7)) || { outer: 0, product: 0 };
    e.outer += p.outerKg; e.product += p.productKg;
    byMonth.set(p.date.slice(0, 7), e);
  }
  const t = usage.totals;
  return [
    `## Verpackungsverbrauch / LUCID (letzte ${MONTHS} Monate, ${from.slice(0, 10)} bis ${to.slice(0, 10)})`,
    'Außenverpackung = Versandkarton-Tara; Produktverpackung = Verkaufsverpackung pro Stück × versendete Menge. Für LUCID/VerpackG zählen beide Mengen je Material.',
    `- Sendungen: ${fmt(t.shipmentCount)} · Verpackung gesamt: ${fmt(t.totalKg, 3)} kg (außen ${fmt(t.outerKg, 3)} kg, Produkt ${fmt(t.productKg, 3)} kg) · Ø pro Sendung: ${fmt(t.avgPerShipmentG)} g`,
    '',
    '### Nach Material (LUCID-Fraktionen)',
    '| Material | Außen kg | Produkt kg | Gesamt kg |',
    '|----------|----------|------------|-----------|',
    ...usage.byMaterial.map(m => `| ${m.material} | ${fmt(m.outerKg, 3)} | ${fmt(m.productKg, 3)} | ${fmt(m.outerKg + m.productKg, 3)} |`),
    '',
    '### Verbrauchte Versandverpackungen nach Typ',
    '| Verpackung | Anzahl | kg |',
    '|------------|--------|----|',
    ...usage.byPackagingType.map(p => `| ${p.name} | ${fmt(p.count)} | ${fmt(p.kg, 3)} |`),
    '',
    '### Verpackung pro Monat',
    '| Monat | Außen kg | Produkt kg | Gesamt kg |',
    '|-------|----------|------------|-----------|',
    ...[...byMonth.entries()].sort().map(([m, e]) => `| ${m} | ${fmt(e.outer, 3)} | ${fmt(e.product, 3)} | ${fmt(e.outer + e.product, 3)} |`),
  ].join('\n');
}

// ─── Public API ──────────────────────────────────────────────

export async function loadWarehouseAnalyticsContext(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return '';

  const safe = async (label: string, fn: () => Promise<string>) => {
    try {
      return await fn();
    } catch (e) {
      console.warn(`AI analytics context: ${label} failed`, e);
      return '';
    }
  };

  const blocks = await Promise.all([
    safe('sales', () => buildSalesBlock(tenantId)),
    safe('shipments', () => buildShipmentsBlock(tenantId)),
    safe('packaging', buildPackagingBlock),
  ]);
  const body = blocks.filter(Boolean).join('\n\n');
  if (!body) return '';
  return `# AUSWERTUNGEN (vollständig aggregiert, Stand ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)\nDiese Zahlen sind exakte Summen über ALLE Datensätze. Nutze sie bevorzugt für Mengen-, Verkaufs-, Versand- und Verpackungsfragen.\n\n${body}`;
}
