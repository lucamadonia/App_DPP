/**
 * LUCID / VerpackG monthly reporting service.
 *
 * Aggregates packaging material consumed in a given month from
 * wh_packaging_transactions × wh_packaging_types, walking each
 * packaging's material_split (or fallback primary_material × tare).
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  LucidAggregateRow,
  LucidMaterial,
  LucidSnapshot,
  ComplianceMonthlyReport,
  MaterialSplitEntry,
} from '@/types/compliance';
import { resolveMaterialShares, LUCID_MATERIAL_ORDER } from '@/types/compliance';
import { getComplianceSettings } from './compliance-settings';
import { logComplianceAction } from './compliance-audit';
import { transformReport } from './compliance-ear';

function monthBounds(reportMonth: string): { from: string; to: string } {
  const d = new Date(reportMonth + 'T00:00:00Z');
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
  return { from, to };
}

export async function aggregateLucidForMonth(reportMonth: string): Promise<LucidSnapshot> {
  const tenantId = await getCurrentTenantId();
  const empty: LucidSnapshot = {
    rows: LUCID_MATERIAL_ORDER.map(m => ({
      material: m, totalWeightGrams: 0, contributingShipmentCount: 0, perPackaging: [],
    })),
    totalWeightGrams: 0,
    shipmentCount: 0,
    lucidNumber: '',
    distributorRole: 'manufacturer',
  };
  if (!tenantId) return empty;

  const settings = await getComplianceSettings();
  const { from, to } = monthBounds(reportMonth);

  // Aggregate consumption transactions by packaging_type
  const { data: tx, error } = await supabase
    .from('wh_packaging_transactions')
    .select('packaging_type_id, shipment_id, quantity_change')
    .eq('tenant_id', tenantId)
    .eq('type', 'consumption')
    .gte('created_at', from)
    .lt('created_at', to);
  if (error || !tx) {
    return { ...empty, lucidNumber: settings.lucid?.lucidNumber || '',
      distributorRole: settings.lucid?.distributorRole || 'manufacturer',
      dualSystem: settings.lucid?.dualSystem };
  }

  const consumed = new Map<string, { count: number; shipmentIds: Set<string> }>();
  for (const row of tx) {
    if (!row.packaging_type_id) continue;
    const e = consumed.get(row.packaging_type_id) || { count: 0, shipmentIds: new Set<string>() };
    e.count += Math.abs(row.quantity_change || 0);
    if (row.shipment_id) e.shipmentIds.add(row.shipment_id);
    consumed.set(row.packaging_type_id, e);
  }

  if (consumed.size === 0) {
    return { ...empty, lucidNumber: settings.lucid?.lucidNumber || '',
      distributorRole: settings.lucid?.distributorRole || 'manufacturer',
      dualSystem: settings.lucid?.dualSystem };
  }

  // Load packaging metadata
  const { data: packagings } = await supabase
    .from('wh_packaging_types')
    .select('id, name, tare_weight_grams, primary_material, material_split')
    .in('id', Array.from(consumed.keys()));

  const materialBuckets = new Map<LucidMaterial, LucidAggregateRow>();
  for (const m of LUCID_MATERIAL_ORDER) {
    materialBuckets.set(m, {
      material: m, totalWeightGrams: 0, contributingShipmentCount: 0, perPackaging: [],
    });
  }

  const allShipmentIds = new Set<string>();
  let totalWeightGrams = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const pt of packagings || ([] as any[])) {
    const c = consumed.get(pt.id);
    if (!c) continue;
    c.shipmentIds.forEach(s => allShipmentIds.add(s));

    const shares: MaterialSplitEntry[] = resolveMaterialShares(
      pt.primary_material,
      pt.material_split,
      pt.tare_weight_grams || 0,
    );
    if (shares.length === 0) continue;

    for (const share of shares) {
      const weightContribution = share.weight_grams * c.count;
      const bucket = materialBuckets.get(share.material);
      if (!bucket) continue;
      bucket.totalWeightGrams += weightContribution;
      bucket.perPackaging.push({
        packagingId: pt.id,
        packagingName: pt.name,
        consumedCount: c.count,
        weightPerUnit: share.weight_grams,
        weightContributionGrams: weightContribution,
      });
      totalWeightGrams += weightContribution;
    }
  }

  // Count distinct contributing shipments per material
  for (const bucket of materialBuckets.values()) {
    const shipmentSet = new Set<string>();
    for (const p of bucket.perPackaging) {
      const con = consumed.get(p.packagingId);
      con?.shipmentIds.forEach(s => shipmentSet.add(s));
    }
    bucket.contributingShipmentCount = shipmentSet.size;
  }

  return {
    rows: LUCID_MATERIAL_ORDER.map(m => materialBuckets.get(m)!),
    totalWeightGrams,
    shipmentCount: allShipmentIds.size,
    lucidNumber: settings.lucid?.lucidNumber || '',
    distributorRole: settings.lucid?.distributorRole || 'manufacturer',
    dualSystem: settings.lucid?.dualSystem,
  };
}

export async function generateLucidReport(reportMonth: string): Promise<{
  ok: boolean; reportId?: string; error?: string;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };

  const snapshot = await aggregateLucidForMonth(reportMonth);

  const packagingIds = new Set<string>();
  const shipmentIds = new Set<string>();
  for (const row of snapshot.rows) {
    for (const p of row.perPackaging) packagingIds.add(p.packagingId);
  }
  // Re-fetch shipment ids for archival
  const { from, to } = monthBounds(reportMonth);
  const { data: tx } = await supabase
    .from('wh_packaging_transactions')
    .select('shipment_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'consumption')
    .gte('created_at', from)
    .lt('created_at', to);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tx || []).forEach((r: any) => r.shipment_id && shipmentIds.add(r.shipment_id));

  const { data: existing } = await supabase
    .from('compliance_monthly_reports')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('report_type', 'lucid')
    .eq('report_month', reportMonth)
    .maybeSingle();

  if (existing && existing.status !== 'draft' && existing.status !== 'obsolete') {
    return { ok: false, error: `Report for ${reportMonth} is already ${existing.status} and cannot be regenerated.` };
  }

  const { data: user } = await supabase.auth.getUser();
  const row = {
    tenant_id: tenantId,
    report_type: 'lucid',
    report_month: reportMonth,
    status: 'draft',
    generated_by: user.user?.id ?? null,
    generated_at: new Date().toISOString(),
    summary: snapshot,
    shipment_ids: Array.from(shipmentIds),
    product_ids: [],
    packaging_type_ids: Array.from(packagingIds),
  };

  let reportId: string;
  if (existing) {
    const { error } = await supabase.from('compliance_monthly_reports').update(row).eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    reportId = existing.id;
  } else {
    const { data: ins, error } = await supabase
      .from('compliance_monthly_reports').insert(row).select('id').single();
    if (error || !ins) return { ok: false, error: error?.message || 'Insert failed' };
    reportId = ins.id;
  }

  await logComplianceAction({
    reportId,
    action: existing ? 'regenerated' : 'generated',
    details: { reportType: 'lucid', reportMonth, totalKg: (snapshot.totalWeightGrams / 1000).toFixed(3) },
  });

  return { ok: true, reportId };
}

export async function submitLucidReport(
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

export async function getLucidReportForMonth(reportMonth: string): Promise<ComplianceMonthlyReport | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;
  const { data } = await supabase
    .from('compliance_monthly_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('report_type', 'lucid')
    .eq('report_month', reportMonth)
    .maybeSingle();
  if (!data) return null;
  return transformReport(data);
}

/** Patch material + split on a single packaging type — used by setup page inline edits. */
export async function patchPackagingMaterial(
  packagingId: string,
  patch: { primaryMaterial?: LucidMaterial | null; materialSplit?: MaterialSplitEntry[] | null },
): Promise<{ ok: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (patch.primaryMaterial !== undefined) update.primary_material = patch.primaryMaterial;
  if (patch.materialSplit !== undefined) update.material_split = patch.materialSplit;
  const { error } = await supabase.from('wh_packaging_types').update(update).eq('id', packagingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
