/**
 * Supabase Returns Hub Workflow Rules Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhWorkflowRule } from '@/types/returns-hub';
import type { WorkflowGraph } from '@/types/workflow-builder';

/**
 * Serialize a WorkflowGraph into the conditions/actions JSONB columns.
 * The graph is stored in `conditions` with `_graphVersion: 2`.
 * `actions` is kept as a summary array for backward compat with list views.
 */
export function serializeWorkflowGraph(
  graph: WorkflowGraph
): { conditions: Record<string, unknown>; actions: RhWorkflowRule['actions'] } {
  const actionNodes = graph.nodes.filter((n) => n.type === 'action');
  const actions = actionNodes.map((n) => {
    const data = n.data as { actionType: string; params: Record<string, unknown> };
    return { type: data.actionType as RhWorkflowRule['actions'][number]['type'], params: data.params };
  });

  return {
    conditions: graph as unknown as Record<string, unknown>,
    actions,
  };
}

/**
 * Deserialize from DB columns back to a WorkflowGraph.
 * Returns null for legacy (non-graph) rules.
 */
export function deserializeWorkflowGraph(
  conditions: Record<string, unknown>
): WorkflowGraph | null {
  if (conditions && (conditions as { _graphVersion?: number })._graphVersion === 2) {
    return conditions as unknown as WorkflowGraph;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformWorkflowRule(row: any): RhWorkflowRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    triggerType: row.trigger_type,
    conditions: row.conditions || {},
    actions: row.actions || [],
    active: row.active ?? true,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRhWorkflowRules(): Promise<RhWorkflowRule[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('rh_workflow_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order');

  if (error) {
    console.error('Failed to load workflow rules:', error);
    return [];
  }

  return (data || []).map((row: any) => transformWorkflowRule(row));
}

export async function createRhWorkflowRule(
  rule: Omit<RhWorkflowRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_workflow_rules')
    .insert({
      tenant_id: tenantId,
      name: rule.name,
      description: rule.description || null,
      trigger_type: rule.triggerType,
      conditions: rule.conditions || {},
      actions: rule.actions || [],
      active: rule.active ?? true,
      sort_order: rule.sortOrder || 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create workflow rule:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updateRhWorkflowRule(
  id: string,
  updates: Partial<RhWorkflowRule>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description || null;
  if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
  if (updates.actions !== undefined) updateData.actions = updates.actions;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

  const { error } = await supabase
    .from('rh_workflow_rules')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update workflow rule:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteRhWorkflowRule(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('rh_workflow_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete workflow rule:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
