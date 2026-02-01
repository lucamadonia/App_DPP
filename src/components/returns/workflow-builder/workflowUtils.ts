import type {
  WorkflowGraph,
  WorkflowNode,
  Position,
  WorkflowNodeType,
  WorkflowActionType,
  TriggerEventType,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
  PaletteItemDragData,
} from '@/types/workflow-builder';
import { GRID_SNAP_SIZE } from '@/types/workflow-builder';

// ---- ID Generation ----

let _counter = 0;
export function generateNodeId(): string {
  _counter += 1;
  return `node_${Date.now().toString(36)}_${_counter.toString(36)}`;
}

export function generateEdgeId(): string {
  _counter += 1;
  return `edge_${Date.now().toString(36)}_${_counter.toString(36)}`;
}

// ---- Label lookup maps ----

export const ACTION_TYPE_LABELS: Record<WorkflowActionType, string> = {
  set_status: 'Set Status',
  set_priority: 'Set Priority',
  assign: 'Assign',
  approve: 'Approve',
  reject: 'Reject',
  add_note: 'Add Note',
  update_field: 'Update Field',
  ticket_create: 'Create Ticket',
  ticket_set_status: 'Ticket Status',
  ticket_set_priority: 'Ticket Priority',
  ticket_assign: 'Ticket Assign',
  ticket_add_message: 'Ticket Message',
  ticket_add_tag: 'Ticket Tag',
  customer_update_risk_score: 'Update Risk Score',
  customer_add_tag: 'Customer Tag',
  customer_update_notes: 'Update Notes',
  email_send_template: 'Send Email Template',
  email_send_custom: 'Send Custom Email',
  notification_internal: 'Internal Notification',
  timeline_add_entry: 'Timeline Entry',
  webhook_call: 'Webhook',
};

export const TRIGGER_TYPE_LABELS: Record<TriggerEventType, string> = {
  return_created: 'Return Created',
  return_status_changed: 'Status Changed',
  return_overdue: 'Return Overdue',
  ticket_created: 'Ticket Created',
  ticket_status_changed: 'Ticket Status Changed',
  ticket_overdue: 'Ticket Overdue',
  customer_risk_changed: 'Risk Score Changed',
  customer_tag_added: 'Customer Tag Added',
  scheduled_daily: 'Daily Schedule',
  scheduled_weekly: 'Weekly Schedule',
  scheduled_monthly: 'Monthly Schedule',
  manual: 'Manual Trigger',
};

// ---- Snap to grid ----

export function snapToGrid(position: Position, gridSize: number = GRID_SNAP_SIZE): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

// ---- Fit to view ----

export function computeFitToView(
  nodes: WorkflowNode[],
  canvasW: number,
  canvasH: number,
  padding: number = 60
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) return { x: 40, y: 40, zoom: 1 };

  const NODE_W = 220;
  const NODE_H = 72;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_W);
    maxY = Math.max(maxY, n.position.y + NODE_H);
  }

  const graphW = maxX - minX;
  const graphH = maxY - minY;
  const availableW = canvasW - padding * 2;
  const availableH = canvasH - padding * 2;

  if (availableW <= 0 || availableH <= 0) return { x: 40, y: 40, zoom: 1 };

  const zoom = Math.min(1.5, Math.max(0.25, Math.min(availableW / graphW, availableH / graphH)));

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = canvasW / 2 - cx * zoom;
  const y = canvasH / 2 - cy * zoom;

  return { x, y, zoom };
}

// ---- Validation ----

export interface ValidationError {
  nodeId?: string;
  message: string;
}

export function validateWorkflow(graph: WorkflowGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // Must have exactly 1 trigger
  const triggers = graph.nodes.filter((n) => n.type === 'trigger');
  if (triggers.length === 0) {
    errors.push({ message: 'Workflow must have a trigger node' });
  } else if (triggers.length > 1) {
    errors.push({ message: 'Workflow can only have one trigger node' });
  }

  // Check all nodes are connected (reachable from trigger via BFS)
  if (triggers.length === 1) {
    const reachable = new Set<string>();
    const queue = [triggers[0].id];
    const adjacency = new Map<string, string[]>();

    for (const edge of graph.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const neighbors = adjacency.get(current) || [];
      for (const n of neighbors) {
        if (!reachable.has(n)) queue.push(n);
      }
    }

    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        errors.push({ nodeId: node.id, message: `Node "${node.label}" is not connected to the workflow` });
      }
    }
  }

  // Condition nodes should have both true and false branches
  const conditionNodes = graph.nodes.filter((n) => n.type === 'condition');
  for (const cn of conditionNodes) {
    const outEdges = graph.edges.filter((e) => e.source === cn.id);
    const hasTrue = outEdges.some((e) => e.sourceHandle === 'true');
    const hasFalse = outEdges.some((e) => e.sourceHandle === 'false');
    if (!hasTrue || !hasFalse) {
      errors.push({
        nodeId: cn.id,
        message: `Condition "${cn.label}" needs both True and False branches`,
      });
    }
  }

  // Cycle detection via DFS
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of graph.nodes) color.set(node.id, WHITE);

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    for (const neighbor of adjacency.get(nodeId) || []) {
      if (color.get(neighbor) === GRAY) return true; // back edge = cycle
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of graph.nodes) {
    if (color.get(node.id) === WHITE && dfs(node.id)) {
      errors.push({ message: 'Workflow contains a cycle — this may cause infinite loops' });
      break;
    }
  }

  return errors;
}

// ---- Auto Layout (BFS layered) ----

const LAYER_GAP_X = 280;
const NODE_GAP_Y = 100;

export function autoLayoutGraph(graph: WorkflowGraph): WorkflowGraph {
  if (graph.nodes.length === 0) return graph;

  // Find trigger (start node), or first node
  const trigger = graph.nodes.find((n) => n.type === 'trigger') || graph.nodes[0];

  // Build adjacency
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  // BFS to assign layers
  const layers = new Map<string, number>();
  const queue: Array<{ id: string; layer: number }> = [{ id: trigger.id, layer: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    layers.set(id, layer);
    const neighbors = adjacency.get(id) || [];
    for (const n of neighbors) {
      if (!visited.has(n)) queue.push({ id: n, layer: layer + 1 });
    }
  }

  // Place unreachable nodes in their own layer
  let maxLayer = 0;
  for (const l of layers.values()) {
    if (l > maxLayer) maxLayer = l;
  }
  for (const node of graph.nodes) {
    if (!layers.has(node.id)) {
      maxLayer += 1;
      layers.set(node.id, maxLayer);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(nodeId);
  }

  // Assign positions
  const newPositions = new Map<string, Position>();
  const startX = 60;
  const startY = 60;

  for (const [layer, nodeIds] of layerGroups) {
    const totalHeight = nodeIds.length * NODE_GAP_Y;
    const offsetY = startY - totalHeight / 2 + NODE_GAP_Y / 2;
    nodeIds.forEach((id, index) => {
      newPositions.set(id, {
        x: startX + layer * LAYER_GAP_X,
        y: offsetY + index * NODE_GAP_Y + (nodeIds.length > 1 ? 0 : 80),
      });
    });
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: newPositions.get(node.id) || node.position,
    })),
  };
}

// ---- Default node data factories ----

export function createDefaultTriggerData(): TriggerNodeData {
  return { eventType: 'return_created' };
}

export function createDefaultConditionData(): ConditionNodeData {
  return { logicOperator: 'AND', conditions: [] };
}

export function createDefaultActionData(): ActionNodeData {
  return { actionType: 'set_status', params: {} };
}

export function createDefaultDelayData(): DelayNodeData {
  return { amount: 1, unit: 'hours' };
}

export function createDefaultNodeData(type: WorkflowNodeType) {
  switch (type) {
    case 'trigger': return createDefaultTriggerData();
    case 'condition': return createDefaultConditionData();
    case 'action': return createDefaultActionData();
    case 'delay': return createDefaultDelayData();
  }
}

export function createNode(
  type: WorkflowNodeType,
  position: Position,
  label: string,
  dataOverrides?: Partial<PaletteItemDragData>
): WorkflowNode {
  const data = createDefaultNodeData(type);

  // Apply overrides from palette drag data
  if (dataOverrides) {
    if (type === 'action' && dataOverrides.actionType) {
      (data as ActionNodeData).actionType = dataOverrides.actionType;
    }
    if (type === 'trigger' && dataOverrides.eventType) {
      (data as TriggerNodeData).eventType = dataOverrides.eventType;
    }
  }

  return {
    id: generateNodeId(),
    type,
    position,
    data,
    label,
  };
}
