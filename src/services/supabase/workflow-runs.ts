import { getCurrentTenantId, supabase } from '@/lib/supabase';

export interface WorkflowRun {
  id: string;
  rule_id: string;
  status: 'queued' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  created_at: string;
  available_at: string;
}

export async function getWorkflowRuns(): Promise<WorkflowRun[]> {
  const tenant = await getCurrentTenantId();
  if (!tenant) throw new Error('No tenant');
  const { data, error } = await supabase.from('rh_workflow_runs')
    .select('id,rule_id,status,error,created_at,available_at').eq('tenant_id', tenant)
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
}

export async function runWorkflowManually(ruleId: string, entity?: { type: 'return' | 'ticket' | 'customer'; id: string }) {
  const { data, error } = await supabase.rpc('run_workflow_manually', {
    p_rule_id: ruleId,
    ...(entity ? { [`p_${entity.type}_id`]: entity.id } : {}),
  });
  if (error) throw error;
  if (!data) throw new Error('Workflow rules are disabled');
  return data as string;
}
