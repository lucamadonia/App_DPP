import type {
  WorkflowGraph,
  WorkflowNode,
  Position,
  WorkflowNodeType,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
} from '@/types/workflow-builder';

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
  label: string
): WorkflowNode {
  return {
    id: generateNodeId(),
    type,
    position,
    data: createDefaultNodeData(type),
    label,
  };
}
