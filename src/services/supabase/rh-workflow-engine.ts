/**
 * Workflow Execution Engine
 *
 * Evaluates active workflow rules when trigger events occur.
 * Walks the graph from the trigger node, evaluates conditions,
 * executes actions, and handles delay nodes.
 *
 * Client-side only — delay nodes require browser tab to stay open.
 */

import type {
  WorkflowGraph,
  WorkflowNode,
  TriggerEventType,
  ConditionOperator,
  ConditionLogicOperator,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
  TriggerNodeData,
  FieldCondition,
} from '@/types/workflow-builder';
import type { RhReturn, RhTicket, RhCustomer, ReturnStatus } from '@/types/returns-hub';
import { supabase } from '@/lib/supabase';
import { getReturnsHubSettings, getReturnsHubSettingsByTenantId } from './rh-settings';
import { deserializeWorkflowGraph, buildGraphFromLegacy } from './rh-workflows';
import { updateReturn, updateReturnStatus, approveReturn, rejectReturn, getReturn } from './returns';
import { addTimelineEntry } from './return-timeline';
import { createRhTicket, updateRhTicket, getRhTicket, addRhTicketMessage } from './rh-tickets';
import { updateRhCustomer, getRhCustomer } from './rh-customers';
import { triggerEmailNotification } from './rh-notification-trigger';
import { createRhNotification } from './rh-notifications';

// ============================================
// PUBLIC TYPES
// ============================================

export interface WorkflowEventContext {
  tenantId: string;
  eventType: TriggerEventType;
  returnId?: string;
  ticketId?: string;
  customerId?: string;
  return?: RhReturn;
  ticket?: RhTicket;
  customer?: RhCustomer;
  previousStatus?: string;
  previousRiskScore?: number;
  previousTags?: string[];
}

// ============================================
// RE-ENTRANCY GUARD
// ============================================

const executingRuleIds = new Set<string>();

// ============================================
// MAIN ENTRY POINT
// ============================================

/**
 * Load active workflow rules matching the given trigger event and execute them.
 * Fire-and-forget — errors are logged, never thrown to the caller.
 */
export async function executeWorkflowsForEvent(
  eventType: TriggerEventType,
  context: WorkflowEventContext
): Promise<void> {
  try {
    // Feature gate — try authenticated settings first, fall back to tenantId lookup (public portal)
    let settings;
    try {
      settings = await getReturnsHubSettings();
    } catch {
      settings = null;
    }
    if (!settings?.features?.workflowRules && context.tenantId) {
      settings = await getReturnsHubSettingsByTenantId(context.tenantId);
    }
    if (!settings?.features?.workflowRules) {
      console.warn('[workflow-engine] Workflow rules feature is disabled in tenant settings — skipping execution.');
      return;
    }

    // Load active rules for this trigger
    const { data: rules, error } = await supabase
      .from('rh_workflow_rules')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .eq('trigger_type', eventType)
      .eq('active', true)
      .order('sort_order');

    if (error) {
      console.error(`[workflow-engine] Failed to load rules for "${eventType}":`, error.message);
      return;
    }
    if (!rules?.length) {
      console.log(`[workflow-engine] No active rules found for trigger "${eventType}" (tenant: ${context.tenantId})`);
      return;
    }

    console.log(`[workflow-engine] Found ${rules.length} active rule(s) for trigger "${eventType}"`);


    // Hydrate context entities if not already present
    const ctx = await hydrateContext(context);

    // Execute each matching rule
    for (const rule of rules) {
      if (executingRuleIds.has(rule.id)) {
        console.warn(`[workflow-engine] Skipping re-entrant rule "${rule.name}" (${rule.id})`);
        continue;
      }

      let graph = deserializeWorkflowGraph(rule.conditions || {});
      if (!graph) {
        // Attempt on-the-fly migration of legacy rule
        if (rule.actions?.length) {
          console.warn(`[workflow-engine] Rule "${rule.name}" (${rule.id}) is legacy format — migrating on-the-fly`);
          graph = buildGraphFromLegacy(rule.trigger_type, rule.actions);
          // Persist migration so this only happens once
          supabase
            .from('rh_workflow_rules')
            .update({ conditions: graph as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
            .eq('id', rule.id)
            .then(({ error: migErr }) => {
              if (migErr) console.error(`[workflow-engine] Failed to persist migration for rule "${rule.name}":`, migErr.message);
              else console.log(`[workflow-engine] Persisted migration for rule "${rule.name}"`);
            });
        } else {
          console.warn(`[workflow-engine] Rule "${rule.name}" (${rule.id}) has no valid graph and no actions — skipping`);
          continue;
        }
      }

      executingRuleIds.add(rule.id);
      try {
        console.log(`[workflow-engine] Executing rule "${rule.name}" (${rule.id}) — ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
        await walkGraph(graph, ctx);
        console.log(`[workflow-engine] Rule "${rule.name}" completed successfully`);
      } catch (err) {
        console.error(`[workflow-engine] Error executing rule "${rule.name}":`, err);
      } finally {
        executingRuleIds.delete(rule.id);
      }
    }
  } catch (err) {
    console.error('[workflow-engine] executeWorkflowsForEvent error:', err);
  }
}

// ============================================
// CONTEXT HYDRATION
// ============================================

async function hydrateContext(ctx: WorkflowEventContext): Promise<WorkflowEventContext> {
  const hydrated = { ...ctx };

  if (ctx.returnId && !ctx.return) {
    const ret = await getReturn(ctx.returnId);
    if (ret) {
      hydrated.return = ret;
      if (!hydrated.customerId && ret.customerId) {
        hydrated.customerId = ret.customerId;
      }
    }
  }

  if (ctx.ticketId && !ctx.ticket) {
    const ticket = await getRhTicket(ctx.ticketId);
    if (ticket) {
      hydrated.ticket = ticket;
      if (!hydrated.customerId && ticket.customerId) {
        hydrated.customerId = ticket.customerId;
      }
    }
  }

  if (hydrated.customerId && !ctx.customer) {
    const customer = await getRhCustomer(hydrated.customerId);
    if (customer) hydrated.customer = customer;
  }

  return hydrated;
}

// ============================================
// GRAPH WALKING
// ============================================

async function walkGraph(graph: WorkflowGraph, ctx: WorkflowEventContext): Promise<void> {
  // Find the trigger node
  const triggerNode = graph.nodes.find((n) => n.type === 'trigger');
  if (!triggerNode) {
    console.warn('[workflow-engine] No trigger node found in graph — aborting walk');
    return;
  }

  // Check trigger-level filters
  const triggerData = triggerNode.data as TriggerNodeData;
  if (triggerData.filters?.length) {
    for (const filter of triggerData.filters) {
      const fieldValue = resolveFieldValue(filter.field, ctx);
      if (!applyOperator(filter.operator, fieldValue, filter.value)) {
        console.log(`[workflow-engine] Trigger filter not met: ${filter.field} ${filter.operator} ${String(filter.value)} (actual: ${String(fieldValue)})`);
        return;
      }
    }
  }

  // Walk from the trigger node
  await walkFromNode(triggerNode.id, graph, ctx);
}

async function walkFromNode(
  nodeId: string,
  graph: WorkflowGraph,
  ctx: WorkflowEventContext
): Promise<void> {
  // Find outgoing edges from this node
  const outgoingEdges = graph.edges.filter((e) => e.source === nodeId);
  if (!outgoingEdges.length) return;

  for (const edge of outgoingEdges) {
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    if (!targetNode) continue;

    switch (targetNode.type) {
      case 'condition': {
        const result = evaluateConditionNode(targetNode, ctx);
        // Follow the matching branch ('true' or 'false')
        const branchLabel = result ? 'true' : 'false';
        const branchEdges = graph.edges.filter(
          (e) => e.source === targetNode.id && e.sourceHandle === branchLabel
        );
        for (const branchEdge of branchEdges) {
          await walkFromNode(branchEdge.target, graph, ctx);
        }
        break;
      }

      case 'action': {
        await executeActionNode(targetNode, ctx);
        await walkFromNode(targetNode.id, graph, ctx);
        break;
      }

      case 'delay': {
        const delayData = targetNode.data as DelayNodeData;
        const ms = delayToMs(delayData.amount, delayData.unit);
        await new Promise((resolve) => setTimeout(resolve, ms));
        await walkFromNode(targetNode.id, graph, ctx);
        break;
      }

      default:
        // Unknown node type, continue walking
        await walkFromNode(targetNode.id, graph, ctx);
        break;
    }
  }
}

function delayToMs(amount: number, unit: string): number {
  switch (unit) {
    case 'minutes': return amount * 60 * 1000;
    case 'hours': return amount * 60 * 60 * 1000;
    case 'days': return amount * 24 * 60 * 60 * 1000;
    default: return amount * 1000;
  }
}

// ============================================
// CONDITION EVALUATION
// ============================================

function evaluateConditionNode(node: WorkflowNode, ctx: WorkflowEventContext): boolean {
  const data = node.data as ConditionNodeData;
  if (!data.conditions?.length) return true;

  const logic: ConditionLogicOperator = data.logicOperator || 'AND';

  if (logic === 'AND') {
    return data.conditions.every((cond) => evaluateFieldCondition(cond, ctx));
  } else {
    return data.conditions.some((cond) => evaluateFieldCondition(cond, ctx));
  }
}

function evaluateFieldCondition(cond: FieldCondition, ctx: WorkflowEventContext): boolean {
  const fieldValue = resolveFieldValue(cond.field, ctx);
  return applyOperator(cond.operator, fieldValue, cond.value);
}

// ============================================
// FIELD RESOLUTION
// ============================================

function resolveFieldValue(fieldPath: string, ctx: WorkflowEventContext): unknown {
  // Support dotted paths like "return.status", "customer.riskScore"
  // Also support bare field names which default to return entity
  const parts = fieldPath.split('.');

  let entity: Record<string, unknown> | undefined;
  let pathParts: string[];

  if (parts[0] === 'return' && ctx.return) {
    entity = ctx.return as unknown as Record<string, unknown>;
    pathParts = parts.slice(1);
  } else if (parts[0] === 'customer' && ctx.customer) {
    entity = ctx.customer as unknown as Record<string, unknown>;
    pathParts = parts.slice(1);
  } else if (parts[0] === 'ticket' && ctx.ticket) {
    entity = ctx.ticket as unknown as Record<string, unknown>;
    pathParts = parts.slice(1);
  } else if (ctx.return) {
    // Default: bare field name resolves against return
    entity = ctx.return as unknown as Record<string, unknown>;
    pathParts = parts;
  } else if (ctx.ticket) {
    entity = ctx.ticket as unknown as Record<string, unknown>;
    pathParts = parts;
  } else {
    return undefined;
  }

  // Walk the path
  let value: unknown = entity;
  for (const part of pathParts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

// ============================================
// OPERATOR EVALUATION
// ============================================

function applyOperator(operator: ConditionOperator, fieldValue: unknown, compareValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return String(fieldValue) === String(compareValue);

    case 'not_equals':
      return String(fieldValue) !== String(compareValue);

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());

    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());

    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);

    case 'less_than':
      return Number(fieldValue) < Number(compareValue);

    case 'greater_or_equal':
      return Number(fieldValue) >= Number(compareValue);

    case 'less_or_equal':
      return Number(fieldValue) <= Number(compareValue);

    case 'in': {
      const list = Array.isArray(compareValue) ? compareValue : String(compareValue).split(',').map((s) => s.trim());
      return list.includes(String(fieldValue));
    }

    case 'not_in': {
      const list = Array.isArray(compareValue) ? compareValue : String(compareValue).split(',').map((s) => s.trim());
      return !list.includes(String(fieldValue));
    }

    case 'is_empty':
      return fieldValue == null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

    case 'is_not_empty':
      return fieldValue != null && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);

    case 'matches_regex': {
      try {
        const regex = new RegExp(String(compareValue));
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

// ============================================
// ACTION EXECUTION
// ============================================

async function executeActionNode(node: WorkflowNode, ctx: WorkflowEventContext): Promise<void> {
  const data = node.data as ActionNodeData;
  await executeAction(data.actionType, data.params || {}, ctx);
}

async function executeAction(
  actionType: string,
  params: Record<string, unknown>,
  ctx: WorkflowEventContext
): Promise<void> {
  try {
    switch (actionType) {
      // ---- Return actions ----
      case 'set_status': {
        if (!ctx.returnId) break;
        await updateReturnStatus(ctx.returnId, params.status as ReturnStatus, 'Workflow automation');
        break;
      }

      case 'set_priority': {
        if (!ctx.returnId) break;
        await updateReturn(ctx.returnId, { priority: params.priority as RhReturn['priority'] });
        break;
      }

      case 'assign': {
        if (!ctx.returnId) break;
        await updateReturn(ctx.returnId, { assignedTo: (params.assignTo || params.assignee) as string });
        break;
      }

      case 'approve': {
        if (!ctx.returnId) break;
        await approveReturn(ctx.returnId);
        break;
      }

      case 'reject': {
        if (!ctx.returnId) break;
        await rejectReturn(ctx.returnId, (params.reason as string) || 'Rejected by workflow');
        break;
      }

      case 'add_note': {
        if (!ctx.returnId) break;
        const ret = ctx.return || await getReturn(ctx.returnId);
        if (ret) {
          await addTimelineEntry({
            returnId: ctx.returnId,
            status: ret.status,
            comment: (params.note as string) || (params.message as string) || '',
            actorType: 'system',
            metadata: { source: 'workflow' },
          });
        }
        break;
      }

      case 'update_field': {
        if (!ctx.returnId) break;
        const field = params.field as string;
        const value = params.value;
        if (field) {
          await updateReturn(ctx.returnId, { [field]: value } as Partial<RhReturn>);
        }
        break;
      }

      // ---- Ticket actions ----
      case 'ticket_create': {
        await createRhTicket({
          subject: (params.subject as string) || 'Auto-created by workflow',
          customerId: ctx.customerId,
          returnId: ctx.returnId,
          priority: (params.priority as RhTicket['priority']) || 'normal',
          category: params.category as string,
        });
        break;
      }

      case 'ticket_set_status': {
        if (!ctx.ticketId) break;
        await updateRhTicket(ctx.ticketId, { status: params.status as RhTicket['status'] });
        break;
      }

      case 'ticket_set_priority': {
        if (!ctx.ticketId) break;
        await updateRhTicket(ctx.ticketId, { priority: params.priority as RhTicket['priority'] });
        break;
      }

      case 'ticket_assign': {
        if (!ctx.ticketId) break;
        await updateRhTicket(ctx.ticketId, { assignedTo: (params.assignTo || params.assignee) as string });
        break;
      }

      case 'ticket_add_message': {
        if (!ctx.ticketId) break;
        await addRhTicketMessage({
          ticketId: ctx.ticketId,
          senderType: 'system',
          content: (params.message as string) || '',
          attachments: [],
          isInternal: (params.isInternal as boolean) ?? true,
        });
        break;
      }

      case 'ticket_add_tag': {
        if (!ctx.ticketId) break;
        const ticket = ctx.ticket || await getRhTicket(ctx.ticketId);
        if (ticket) {
          const newTag = params.tag as string;
          if (newTag && !ticket.tags.includes(newTag)) {
            await updateRhTicket(ctx.ticketId, { tags: [...ticket.tags, newTag] });
          }
        }
        break;
      }

      // ---- Customer actions ----
      case 'customer_update_risk_score': {
        if (!ctx.customerId) break;
        await updateRhCustomer(ctx.customerId, { riskScore: Number(params.riskScore) });
        break;
      }

      case 'customer_add_tag': {
        if (!ctx.customerId) break;
        const customer = ctx.customer || await getRhCustomer(ctx.customerId);
        if (customer) {
          const newTag = params.tag as string;
          if (newTag && !customer.tags.includes(newTag)) {
            await updateRhCustomer(ctx.customerId, { tags: [...customer.tags, newTag] });
          }
        }
        break;
      }

      case 'customer_update_notes': {
        if (!ctx.customerId) break;
        await updateRhCustomer(ctx.customerId, { notes: params.notes as string });
        break;
      }

      // ---- Notification actions ----
      case 'email_send_template': {
        // Builder saves templateId (UUID), engine needs templateEventType (string).
        // Support both: resolve UUID → event_type via DB if needed.
        console.log(`[workflow-engine] email_send_template — params:`, { templateId: params.templateId, templateEventType: params.templateEventType, recipientEmail: params.recipientEmail });
        let templateEventType = params.templateEventType as string | undefined;
        if (!templateEventType && params.templateId) {
          const { data: tpl, error: tplErr } = await supabase
            .from('rh_email_templates')
            .select('event_type')
            .eq('id', params.templateId as string)
            .single();
          if (tplErr) console.warn(`[workflow-engine] email_send_template — template lookup failed for ID "${params.templateId}":`, tplErr.message);
          templateEventType = tpl?.event_type;
        }
        if (!templateEventType) {
          console.warn(`[workflow-engine] email_send_template — no templateEventType resolved (templateId: ${params.templateId}) — skipping`);
          break;
        }
        const customer = ctx.customer || (ctx.customerId ? await getRhCustomer(ctx.customerId) : null);
        const recipientEmail = (params.recipientEmail as string) || customer?.email;
        if (!recipientEmail) {
          console.warn(`[workflow-engine] email_send_template — no recipientEmail (customerId: ${ctx.customerId}, customer email: ${customer?.email}) — skipping`);
          break;
        }
        console.log(`[workflow-engine] email_send_template — sending "${templateEventType}" to "${recipientEmail}"`);
        const emailResult = await triggerEmailNotification(templateEventType as Parameters<typeof triggerEmailNotification>[0], {
          recipientEmail,
          customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '',
          returnNumber: ctx.return?.returnNumber,
          status: ctx.return?.status,
          ticketNumber: ctx.ticket?.ticketNumber,
          subject: ctx.ticket?.subject,
          returnId: ctx.returnId,
          ticketId: ctx.ticketId,
          customerId: ctx.customerId,
        });
        console.log(`[workflow-engine] email_send_template — result:`, emailResult);
        break;
      }

      case 'email_send_custom': {
        const customer = ctx.customer || (ctx.customerId ? await getRhCustomer(ctx.customerId) : null);
        const recipientEmail = (params.recipientEmail as string) || customer?.email;
        if (!recipientEmail) {
          console.warn(`[workflow-engine] email_send_custom — no recipientEmail (customerId: ${ctx.customerId}) — skipping`);
          break;
        }
        console.log(`[workflow-engine] email_send_custom — sending to "${recipientEmail}"`);
        await createRhNotification({
          channel: 'email',
          returnId: ctx.returnId,
          ticketId: ctx.ticketId,
          customerId: ctx.customerId,
          subject: (params.subject as string) || 'Workflow Notification',
          content: (params.content || params.body) as string || '',
          metadata: { source: 'workflow', recipientEmail },
        });
        break;
      }

      case 'notification_internal': {
        await createRhNotification({
          channel: 'websocket',
          returnId: ctx.returnId,
          ticketId: ctx.ticketId,
          customerId: ctx.customerId,
          content: (params.message as string) || (params.content as string) || '',
          metadata: { source: 'workflow', isInternal: true },
        });
        break;
      }

      // ---- Utility actions ----
      case 'timeline_add_entry': {
        if (!ctx.returnId) break;
        await addTimelineEntry({
          returnId: ctx.returnId,
          status: (params.status as string) || ctx.return?.status || 'CREATED',
          comment: (params.comment as string) || '',
          actorType: 'system',
          metadata: { source: 'workflow' },
        });
        break;
      }

      case 'webhook_call': {
        const url = params.url as string;
        if (!url) break;
        const method = (params.method as string)?.toUpperCase() || 'POST';
        // Parse headers: Builder may save as "Key: Value\nKey2: Value2" string
        let parsedHeaders: Record<string, string> = {};
        if (typeof params.headers === 'string') {
          for (const line of (params.headers as string).split('\n')) {
            const idx = line.indexOf(':');
            if (idx > 0) {
              parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
          }
        } else if (params.headers && typeof params.headers === 'object') {
          parsedHeaders = params.headers as Record<string, string>;
        }
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...parsedHeaders,
        };
        // Avoid double-encoding: if body is already a string, use it directly
        let body: string;
        if (params.body) {
          body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        } else {
          body = JSON.stringify({
            event: ctx.eventType,
            returnId: ctx.returnId,
            ticketId: ctx.ticketId,
            customerId: ctx.customerId,
            timestamp: new Date().toISOString(),
          });
        }

        await fetch(url, { method, headers, body: method !== 'GET' ? body : undefined })
          .catch((err) => console.error('[workflow-engine] Webhook call failed:', err));
        break;
      }

      default:
        console.warn(`[workflow-engine] Unknown action type: ${actionType}`);
    }
  } catch (err) {
    console.error(`[workflow-engine] Action "${actionType}" failed:`, err);
  }
}
