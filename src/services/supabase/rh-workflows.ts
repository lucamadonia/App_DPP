/**
 * Supabase Returns Hub Workflow Rules Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhWorkflowRule, RhWorkflowAction } from '@/types/returns-hub';
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, TriggerEventType, WorkflowActionType } from '@/types/workflow-builder';

// ============================================
// LEGACY → V2 MIGRATION MAPS
// ============================================

const LEGACY_TRIGGER_MAP: Record<string, TriggerEventType> = {
  status_changed: 'return_status_changed',
  return_overdue: 'return_created', // fallback — return_overdue not implemented in engine
};

const LEGACY_ACTION_MAP: Record<string, WorkflowActionType> = {
  assign_to: 'assign',
  send_notification: 'email_send_template',
  add_tag: 'customer_add_tag',
};

/**
 * Build a WorkflowGraph from a legacy rule's trigger type and actions array.
 * Maps old trigger/action names to the current engine-compatible names.
 */
export function buildGraphFromLegacy(
  triggerType: string,
  actions: RhWorkflowAction[]
): WorkflowGraph {
  const mappedTrigger = (LEGACY_TRIGGER_MAP[triggerType] || triggerType) as TriggerEventType;

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const triggerId = 'trigger-1';
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { eventType: mappedTrigger },
    label: 'Trigger',
  });

  let prevId = triggerId;
  actions.forEach((action, i) => {
    const mappedType = (LEGACY_ACTION_MAP[action.type] || action.type) as WorkflowActionType;
    const actionId = `action-${i + 1}`;
    nodes.push({
      id: actionId,
      type: 'action',
      position: { x: 250, y: 150 + i * 100 },
      data: { actionType: mappedType, params: action.params || {} },
      label: mappedType,
    });
    edges.push({
      id: `edge-${prevId}-${actionId}`,
      source: prevId,
      target: actionId,
    });
    prevId = actionId;
  });

  return {
    _graphVersion: 2,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

// ============================================
// SERIALIZATION
// ============================================

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

  const rules = (data || []).map((row: any) => transformWorkflowRule(row));

  // Auto-migrate legacy rules that don't have _graphVersion: 2
  await migrateLegacyRules(rules);

  return rules;
}

/**
 * Finds legacy rules (no _graphVersion: 2) and migrates them to graph format.
 * Updates the DB in place and mutates the rule objects so callers see the new data.
 */
async function migrateLegacyRules(rules: RhWorkflowRule[]): Promise<void> {
  const legacyRules = rules.filter(
    (r) => !(r.conditions as { _graphVersion?: number })?._graphVersion
  );

  if (!legacyRules.length) return;

  console.log(`[workflow-migration] Migrating ${legacyRules.length} legacy rule(s) to graph format`);

  for (const rule of legacyRules) {
    try {
      const graph = buildGraphFromLegacy(rule.triggerType, rule.actions);
      const mappedTriggerType = (LEGACY_TRIGGER_MAP[rule.triggerType] || rule.triggerType) as string;

      const { error } = await supabase
        .from('rh_workflow_rules')
        .update({
          conditions: graph as unknown as Record<string, unknown>,
          trigger_type: mappedTriggerType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id);

      if (error) {
        console.error(`[workflow-migration] Failed to migrate rule "${rule.name}":`, error.message);
      } else {
        // Update in-memory object so the caller sees the migrated data
        rule.conditions = graph as unknown as Record<string, unknown>;
        rule.triggerType = mappedTriggerType;
        console.log(`[workflow-migration] Migrated rule "${rule.name}" (${rule.id})`);
      }
    } catch (err) {
      console.error(`[workflow-migration] Error migrating rule "${rule.name}":`, err);
    }
  }
}

export async function createRhWorkflowRule(
  rule: Omit<RhWorkflowRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Billing: check returns hub professional+ and workflow quota
  const { hasModule, checkQuota } = await import('./billing');
  const hasPro = await hasModule('returns_hub_professional', tenantId) || await hasModule('returns_hub_business', tenantId);
  if (!hasPro) {
    return { success: false, error: 'Workflows require Returns Hub Professional or higher.' };
  }
  const quota = await checkQuota('workflow_rule', { tenantId });
  if (!quota.allowed) {
    return { success: false, error: `Workflow rule limit reached (${quota.current}/${quota.limit}). Please upgrade.` };
  }

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
