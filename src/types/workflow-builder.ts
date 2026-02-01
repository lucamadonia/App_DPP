/**
 * Workflow Builder — Type system for the visual node-based workflow editor.
 *
 * Stored in rh_workflow_rules.conditions as JSONB with _graphVersion: 2.
 */

// ============================================
// NODE TYPES
// ============================================

export type WorkflowNodeType = 'trigger' | 'condition' | 'action' | 'delay';

// ---- Trigger events ----
export type TriggerEventType =
  | 'return_created'
  | 'return_status_changed'
  | 'return_overdue'
  | 'ticket_created'
  | 'ticket_status_changed'
  | 'ticket_overdue'
  | 'customer_risk_changed'
  | 'customer_tag_added'
  | 'scheduled_daily'
  | 'scheduled_weekly'
  | 'scheduled_monthly'
  | 'manual';

// ---- Action types ----
export type WorkflowActionType =
  // Return actions
  | 'set_status'
  | 'set_priority'
  | 'assign'
  | 'approve'
  | 'reject'
  | 'add_note'
  | 'update_field'
  // Ticket actions
  | 'ticket_create'
  | 'ticket_set_status'
  | 'ticket_set_priority'
  | 'ticket_assign'
  | 'ticket_add_message'
  | 'ticket_add_tag'
  // Customer actions
  | 'customer_update_risk_score'
  | 'customer_add_tag'
  | 'customer_update_notes'
  // Notification actions
  | 'email_send_template'
  | 'email_send_custom'
  | 'notification_internal'
  // Utility actions
  | 'timeline_add_entry'
  | 'webhook_call';

// ---- Condition operators ----
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex';

export type ConditionLogicOperator = 'AND' | 'OR';

export type DelayUnit = 'minutes' | 'hours' | 'days';

// ============================================
// FIELD METADATA (for FieldPicker)
// ============================================

export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
export type EntityType = 'return' | 'customer' | 'ticket';

export interface FieldMetadata {
  key: string;
  label: string;
  dataType: FieldDataType;
  enumValues?: string[];
  entity: EntityType;
}

// ============================================
// NODE DATA (per type)
// ============================================

export interface ScheduleConfig {
  time?: string;       // HH:mm
  dayOfWeek?: number;  // 0=Sun..6=Sat
  dayOfMonth?: number; // 1-31
}

export interface TriggerFilter {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface TriggerNodeData {
  eventType: TriggerEventType;
  filters?: TriggerFilter[];
  schedule?: ScheduleConfig;
}

export interface FieldCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface ConditionNodeData {
  logicOperator: ConditionLogicOperator;
  conditions: FieldCondition[];
}

export interface ActionNodeData {
  actionType: WorkflowActionType;
  params: Record<string, unknown>;
}

export interface DelayNodeData {
  amount: number;
  unit: DelayUnit;
}

export type WorkflowNodeData =
  | TriggerNodeData
  | ConditionNodeData
  | ActionNodeData
  | DelayNodeData;

// ============================================
// POSITION & VIEWPORT
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

// ============================================
// NODES & EDGES
// ============================================

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: Position;
  data: WorkflowNodeData;
  label: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false'; // for condition branches
}

// ============================================
// GRAPH (root object)
// ============================================

export interface WorkflowGraph {
  _graphVersion: 2;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: CanvasViewport;
}

// ============================================
// ENTITY SCHEMAS (for FieldPicker)
// ============================================

export const RETURN_FIELDS: FieldMetadata[] = [
  { key: 'status', label: 'Status', dataType: 'enum', entity: 'return', enumValues: ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED', 'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED'] },
  { key: 'priority', label: 'Priority', dataType: 'enum', entity: 'return', enumValues: ['low', 'normal', 'high', 'urgent'] },
  { key: 'reasonCategory', label: 'Reason Category', dataType: 'string', entity: 'return' },
  { key: 'desiredSolution', label: 'Desired Solution', dataType: 'enum', entity: 'return', enumValues: ['refund', 'exchange', 'voucher', 'repair'] },
  { key: 'refundAmount', label: 'Refund Amount', dataType: 'number', entity: 'return' },
  { key: 'assignedTo', label: 'Assigned To', dataType: 'string', entity: 'return' },
  { key: 'createdAt', label: 'Created At', dataType: 'date', entity: 'return' },
];

export const CUSTOMER_FIELDS: FieldMetadata[] = [
  { key: 'email', label: 'Email', dataType: 'string', entity: 'customer' },
  { key: 'riskScore', label: 'Risk Score', dataType: 'number', entity: 'customer' },
  { key: 'tags', label: 'Tags', dataType: 'array', entity: 'customer' },
  { key: 'returnStats.totalReturns', label: 'Total Returns', dataType: 'number', entity: 'customer' },
  { key: 'returnStats.returnRate', label: 'Return Rate', dataType: 'number', entity: 'customer' },
];

export const TICKET_FIELDS: FieldMetadata[] = [
  { key: 'status', label: 'Status', dataType: 'enum', entity: 'ticket', enumValues: ['open', 'in_progress', 'waiting', 'resolved', 'closed'] },
  { key: 'priority', label: 'Priority', dataType: 'enum', entity: 'ticket', enumValues: ['low', 'normal', 'high', 'urgent'] },
  { key: 'category', label: 'Category', dataType: 'string', entity: 'ticket' },
  { key: 'tags', label: 'Tags', dataType: 'array', entity: 'ticket' },
  { key: 'assignedTo', label: 'Assigned To', dataType: 'string', entity: 'ticket' },
];

export const ALL_ENTITY_FIELDS: FieldMetadata[] = [
  ...RETURN_FIELDS,
  ...CUSTOMER_FIELDS,
  ...TICKET_FIELDS,
];

// ============================================
// NODE VISUAL CONFIG
// ============================================

export const NODE_COLORS: Record<WorkflowNodeType, string> = {
  trigger: '#10B981',
  condition: '#F59E0B',
  action: '#3B82F6',
  delay: '#8B5CF6',
};

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
