import type { WorkflowGraph, WorkflowNode } from '@/types/workflow-builder';

/** Visit nodes themselves, including the first node after either condition branch. */
export async function walkWorkflow(
  graph: WorkflowGraph,
  startId: string,
  handlers: {
    condition: (node: WorkflowNode) => boolean;
    action: (node: WorkflowNode) => Promise<void>;
    delay: (node: WorkflowNode) => Promise<void>;
  },
): Promise<void> {
  const completed = new Set<string>();
  const active = new Set<string>();
  async function visit(id: string): Promise<void> {
    if (active.has(id)) throw new Error('Workflow contains a cycle');
    if (completed.has(id)) return;
    const node = graph.nodes.find(candidate => candidate.id === id);
    if (!node) throw new Error('Workflow references a missing node');
    active.add(id);
    let branch: string | undefined;
    if (node.type === 'condition') branch = handlers.condition(node) ? 'true' : 'false';
    else if (node.type === 'action') await handlers.action(node);
    else if (node.type === 'delay') await handlers.delay(node);
    for (const edge of graph.edges.filter(edge => edge.source === id && (branch === undefined || edge.sourceHandle === branch))) {
      await visit(edge.target);
    }
    active.delete(id);
    completed.add(id);
  }
  await visit(startId);
}
