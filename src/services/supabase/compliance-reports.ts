/**
 * Compliance report listing + status transitions (independent of generation,
 * which lives in compliance-ear.ts / compliance-lucid.ts).
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ComplianceMonthlyReport,
  ComplianceReportFilter,
} from '@/types/compliance';
import { transformReport } from './compliance-ear';
import { logComplianceAction } from './compliance-audit';

export async function getComplianceReports(filter?: ComplianceReportFilter): Promise<ComplianceMonthlyReport[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let q = supabase
    .from('compliance_monthly_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('report_month', { ascending: false });

  if (filter?.reportType) q = q.eq('report_type', filter.reportType);
  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.yearFrom) q = q.gte('report_month', `${filter.yearFrom}-01-01`);
  if (filter?.yearTo) q = q.lte('report_month', `${filter.yearTo}-12-31`);
  if (filter?.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(transformReport);
}

export async function getComplianceReport(id: string): Promise<ComplianceMonthlyReport | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;
  const { data } = await supabase
    .from('compliance_monthly_reports')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (!data) return null;
  return transformReport(data);
}

export async function markReportConfirmed(reportId: string): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };
  const { error } = await supabase
    .from('compliance_monthly_reports')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('tenant_id', tenantId);
  if (error) return { ok: false, error: error.message };
  await logComplianceAction({ reportId, action: 'confirmed' });
  return { ok: true };
}

export async function markReportRejected(reportId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };
  const { error } = await supabase
    .from('compliance_monthly_reports')
    .update({ status: 'rejected', notes: reason || null })
    .eq('id', reportId)
    .eq('tenant_id', tenantId);
  if (error) return { ok: false, error: error.message };
  await logComplianceAction({ reportId, action: 'rejected', details: { reason } });
  return { ok: true };
}

export async function deleteComplianceReport(reportId: string): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ok: false, error: 'No tenant' };
  const { error } = await supabase
    .from('compliance_monthly_reports')
    .delete()
    .eq('id', reportId)
    .eq('tenant_id', tenantId);
  if (error) return { ok: false, error: error.message };
  await logComplianceAction({ reportId, action: 'deleted' });
  return { ok: true };
}

/**
 * Find the most-recent draft/missing report for each type — used by the
 * reminder banner to detect "Mai 2026 fehlt noch" status.
 */
export async function getPendingReportStatus(): Promise<{
  ear: { reportMonth: string; status: ComplianceMonthlyReport['status'] | 'missing' };
  lucid: { reportMonth: string; status: ComplianceMonthlyReport['status'] | 'missing' };
}> {
  const tenantId = await getCurrentTenantId();
  const previousMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  const fallback = { reportMonth: previousMonth, status: 'missing' as const };
  if (!tenantId) return { ear: fallback, lucid: fallback };

  const { data } = await supabase
    .from('compliance_monthly_reports')
    .select('report_type, status, report_month')
    .eq('tenant_id', tenantId)
    .eq('report_month', previousMonth)
    .in('report_type', ['ear', 'lucid']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earRow = (data || []).find((r: any) => r.report_type === 'ear');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lucidRow = (data || []).find((r: any) => r.report_type === 'lucid');

  return {
    ear: earRow
      ? { reportMonth: earRow.report_month.slice(0, 10), status: earRow.status }
      : { reportMonth: previousMonth, status: 'missing' },
    lucid: lucidRow
      ? { reportMonth: lucidRow.report_month.slice(0, 10), status: lucidRow.status }
      : { reportMonth: previousMonth, status: 'missing' },
  };
}
