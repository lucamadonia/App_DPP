import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ComplianceAuditEntry } from '@/types/compliance';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(row: any): ComplianceAuditEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reportId: row.report_id || undefined,
    action: row.action,
    performedBy: row.performed_by || undefined,
    details: row.details || undefined,
    createdAt: row.created_at,
  };
}

export async function logComplianceAction(params: {
  reportId?: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return;
  const { data: user } = await supabase.auth.getUser();
  await supabase.from('compliance_audit_log').insert({
    tenant_id: tenantId,
    report_id: params.reportId || null,
    action: params.action,
    performed_by: user.user?.id ?? null,
    details: params.details || null,
  });
}

export async function getAuditLog(filter?: {
  reportId?: string;
  limit?: number;
}): Promise<ComplianceAuditEntry[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let q = supabase
    .from('compliance_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filter?.reportId) q = q.eq('report_id', filter.reportId);
  if (filter?.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(transform);
}
