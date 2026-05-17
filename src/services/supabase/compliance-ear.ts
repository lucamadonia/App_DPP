/**
 * EAR / ElektroG monthly reporting service.
 *
 * Aggregates electronic devices shipped in a given month from
 * wh_shipments × wh_shipment_items × products, grouped by EAR category
 * and B2B/B2C. Produces an immutable snapshot that gets stored on the
 * compliance_monthly_reports row.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  EarAggregateRow,
  EarCategory,
  EarSnapshot,
  ComplianceMonthlyReport,
} from '@/types/compliance';
import { getComplianceSettings } from './compliance-settings';
import { logComplianceAction } from './compliance-audit';

function monthBounds(reportMonth: string): { from: string; to: string } {
  const d = new Date(reportMonth + 'T00:00:00Z');
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
  return { from, to };
}

/**
 * Pull all electronic shipment items shipped in the given month.
 * Returns one row per shipment_item; aggregation done in JS.
 */
async function fetchElectronicItemsForMonth(
  tenantId: string,
  reportMonth: string,
): Promise<{
  rows: Array<{
    shipmentId: string;
    productId: string;
    productName: string;
    productManufacturer: string;
    earCategory: EarCategory;
    earBrand: string | null;
    earB2b: boolean;
    earIncludesBattery: boolean;
    earBatteryWeightGrams: number | null;
    netWeight: number | null;
    quantity: number;
  }>;
  shipmentCount: number;
}> {
  const { from, to } = monthBounds(reportMonth);

  const { data, error } = await supabase
    .from('wh_shipment_items')
    .select(`
      shipment_id,
      product_id,
      quantity,
      products!inner (
        id, name, manufacturer, net_weight,
        is_electronic, ear_category, ear_brand, ear_b2b,
        ear_includes_battery, ear_battery_weight_grams
      ),
      wh_shipments!inner (
        id, tenant_id, status, shipped_at
      )
    `)
    .eq('wh_shipments.tenant_id', tenantId)
    .gte('wh_shipments.shipped_at', from)
    .lt('wh_shipments.shipped_at', to)
    .in('wh_shipments.status', ['shipped', 'in_transit', 'delivered'])
    .eq('products.is_electronic', true);

  if (error || !data) {
    console.error('Failed to fetch electronic items:', error);
    return { rows: [], shipmentCount: 0 };
  }

  const shipmentIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data.map((r: any) => {
    shipmentIds.add(r.shipment_id);
    return {
      shipmentId: r.shipment_id,
      productId: r.product_id,
      productName: r.products?.name || '',
      productManufacturer: r.products?.manufacturer || '',
      earCategory: r.products?.ear_category as EarCategory,
      earBrand: r.products?.ear_brand || null,
      earB2b: !!r.products?.ear_b2b,
      earIncludesBattery: !!r.products?.ear_includes_battery,
      earBatteryWeightGrams: r.products?.ear_battery_weight_grams ?? null,
      netWeight: r.products?.net_weight ?? null,
      quantity: r.quantity || 0,
    };
  }).filter(r => r.earCategory != null && r.earCategory >= 1 && r.earCategory <= 6);

  return { rows, shipmentCount: shipmentIds.size };
}

export async function aggregateEarForMonth(reportMonth: string): Promise<EarSnapshot> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      rows: [], totalUnits: 0, totalWeightGrams: 0,
      totalUnitsWithBattery: 0, totalBatteryWeightGrams: 0,
      shipmentCount: 0, weeeNumber: '', brand: '',
    };
  }

  const settings = await getComplianceSettings();
  const { rows: items, shipmentCount } = await fetchElectronicItemsForMonth(tenantId, reportMonth);

  // Bucket by (category, b2b)
  const buckets = new Map<string, EarAggregateRow>();
  let totalUnits = 0;
  let totalWeightGrams = 0;
  let totalUnitsWithBattery = 0;
  let totalBatteryWeightGrams = 0;

  for (const it of items) {
    const key = `${it.earCategory}:${it.earB2b ? '1' : '0'}`;
    let row = buckets.get(key);
    if (!row) {
      row = {
        category: it.earCategory,
        b2b: it.earB2b,
        unitCount: 0,
        totalWeightGrams: 0,
        unitsWithBattery: 0,
        batteryWeightGrams: 0,
        products: [],
      };
      buckets.set(key, row);
    }

    const unitWeight = it.netWeight ?? 0;
    row.unitCount += it.quantity;
    row.totalWeightGrams += unitWeight * it.quantity;
    if (it.earIncludesBattery) {
      row.unitsWithBattery += it.quantity;
      row.batteryWeightGrams += (it.earBatteryWeightGrams ?? 0) * it.quantity;
    }

    // Merge product entry (sum quantity across items for same product)
    const existing = row.products.find(p => p.id === it.productId);
    if (existing) existing.quantity += it.quantity;
    else row.products.push({
      id: it.productId,
      name: it.productName,
      brand: it.earBrand || it.productManufacturer || '',
      quantity: it.quantity,
    });

    totalUnits += it.quantity;
    totalWeightGrams += unitWeight * it.quantity;
    if (it.earIncludesBattery) {
      totalUnitsWithBattery += it.quantity;
      totalBatteryWeightGrams += (it.earBatteryWeightGrams ?? 0) * it.quantity;
    }
  }

  const rows = Array.from(buckets.values()).sort((a, b) =>
    a.category - b.category || Number(a.b2b) - Number(b.b2b),
  );

  return {
    rows,
    totalUnits,
    totalWeightGrams,
    totalUnitsWithBattery,
    totalBatteryWeightGrams,
    shipmentCount,
    weeeNumber: settings.ear?.weeeNumber || '',
    brand: settings.ear?.stiftungEarBrand || '',
  };
}

/**
 * Create or refresh the draft EAR report for the given month. If a draft
 * already exists, overwrite its snapshot; if submitted/confirmed, refuse.
 */
export async function generateEarReport(reportMonth: string): Promise<{
  ok: boolean;
  reportId?: string;
  error?: string;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };

  const snapshot = await aggregateEarForMonth(reportMonth);

  // Collect contributing shipment / product ids
  const productIds = new Set<string>();
  const shipmentIds = new Set<string>();
  for (const row of snapshot.rows) {
    for (const p of row.products) productIds.add(p.id);
  }
  // Need shipment ids — re-fetch quickly to be accurate
  const { from, to } = monthBounds(reportMonth);
  const { data: shipRows } = await supabase
    .from('wh_shipment_items')
    .select('shipment_id, products!inner(is_electronic), wh_shipments!inner(tenant_id, shipped_at, status)')
    .eq('wh_shipments.tenant_id', tenantId)
    .gte('wh_shipments.shipped_at', from)
    .lt('wh_shipments.shipped_at', to)
    .in('wh_shipments.status', ['shipped', 'in_transit', 'delivered'])
    .eq('products.is_electronic', true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (shipRows || []).forEach((r: any) => shipmentIds.add(r.shipment_id));

  // Check existing draft
  const { data: existing } = await supabase
    .from('compliance_monthly_reports')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('report_type', 'ear')
    .eq('report_month', reportMonth)
    .maybeSingle();

  if (existing && existing.status !== 'draft' && existing.status !== 'obsolete') {
    return { ok: false, error: `Report for ${reportMonth} is already ${existing.status} and cannot be regenerated.` };
  }

  const { data: user } = await supabase.auth.getUser();
  const row = {
    tenant_id: tenantId,
    report_type: 'ear',
    report_month: reportMonth,
    status: 'draft',
    generated_by: user.user?.id ?? null,
    generated_at: new Date().toISOString(),
    summary: snapshot,
    shipment_ids: Array.from(shipmentIds),
    product_ids: Array.from(productIds),
    packaging_type_ids: [],
  };

  let reportId: string;
  if (existing) {
    const { error } = await supabase
      .from('compliance_monthly_reports')
      .update(row)
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    reportId = existing.id;
  } else {
    const { data: ins, error } = await supabase
      .from('compliance_monthly_reports')
      .insert(row)
      .select('id')
      .single();
    if (error || !ins) return { ok: false, error: error?.message || 'Insert failed' };
    reportId = ins.id;
  }

  await logComplianceAction({
    reportId,
    action: existing ? 'regenerated' : 'generated',
    details: { reportType: 'ear', reportMonth, units: snapshot.totalUnits },
  });

  return { ok: true, reportId };
}

export async function submitEarReport(
  reportId: string,
  externalReference: string,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('compliance_monthly_reports')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: user.user?.id ?? null,
      external_reference: externalReference,
    })
    .eq('id', reportId)
    .eq('tenant_id', tenantId);
  if (error) return { ok: false, error: error.message };
  await logComplianceAction({ reportId, action: 'submitted', details: { externalReference } });
  return { ok: true };
}

/** List products marked is_electronic for the setup page. */
export async function listElectronicProducts(): Promise<Array<{
  id: string; name: string; manufacturer: string;
  earCategory?: number; earBrand?: string;
  earIncludesBattery: boolean; earB2b: boolean;
  netWeight?: number;
}>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data } = await supabase
    .from('products')
    .select('id, name, manufacturer, ear_category, ear_brand, ear_includes_battery, ear_b2b, net_weight, is_electronic')
    .eq('tenant_id', tenantId)
    .eq('is_electronic', true)
    .order('name');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    manufacturer: r.manufacturer,
    earCategory: r.ear_category ?? undefined,
    earBrand: r.ear_brand ?? undefined,
    earIncludesBattery: !!r.ear_includes_battery,
    earB2b: !!r.ear_b2b,
    netWeight: r.net_weight ?? undefined,
  }));
}

/** Quick patch one EAR field on a product (used by the setup page's inline edits). */
export async function patchProductEar(
  productId: string,
  patch: Partial<{
    isElectronic: boolean;
    earCategory: number | null;
    earBrand: string | null;
    earIncludesBattery: boolean;
    earBatteryWeightGrams: number | null;
    earB2b: boolean;
    earDeviceType: string | null;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (patch.isElectronic !== undefined) update.is_electronic = patch.isElectronic;
  if (patch.earCategory !== undefined) update.ear_category = patch.earCategory;
  if (patch.earBrand !== undefined) update.ear_brand = patch.earBrand;
  if (patch.earIncludesBattery !== undefined) update.ear_includes_battery = patch.earIncludesBattery;
  if (patch.earBatteryWeightGrams !== undefined) update.ear_battery_weight_grams = patch.earBatteryWeightGrams;
  if (patch.earB2b !== undefined) update.ear_b2b = patch.earB2b;
  if (patch.earDeviceType !== undefined) update.ear_device_type = patch.earDeviceType;
  const { error } = await supabase.from('products').update(update).eq('id', productId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Convenience: fetch the latest EAR report metadata for a month (or undefined). */
export async function getEarReportForMonth(reportMonth: string): Promise<ComplianceMonthlyReport | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;
  const { data } = await supabase
    .from('compliance_monthly_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('report_type', 'ear')
    .eq('report_month', reportMonth)
    .maybeSingle();
  if (!data) return null;
  return transformReport(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformReport(row: any): ComplianceMonthlyReport {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reportType: row.report_type,
    reportMonth: typeof row.report_month === 'string' ? row.report_month.slice(0, 10) : row.report_month,
    status: row.status,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by || undefined,
    submittedAt: row.submitted_at || undefined,
    submittedBy: row.submitted_by || undefined,
    confirmedAt: row.confirmed_at || undefined,
    externalReference: row.external_reference || undefined,
    summary: row.summary,
    shipmentIds: row.shipment_ids || [],
    productIds: row.product_ids || [],
    packagingTypeIds: row.packaging_type_ids || [],
    csvStoragePath: row.csv_storage_path || undefined,
    pdfStoragePath: row.pdf_storage_path || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
