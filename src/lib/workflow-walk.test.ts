import { describe, expect, it, vi } from 'vitest';
import type { WorkflowGraph, WorkflowNode } from '@/types/workflow-builder';
import { walkWorkflow } from './workflow-walk';

const node = (id: string, type: WorkflowNode['type']): WorkflowNode => ({ id, type, position: { x: 0, y: 0 }, label: id, data: { actionType: 'add_note', params: {} } });
const graph: WorkflowGraph = {
  _graphVersion: 2, viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [node('trigger', 'trigger'), node('condition', 'condition'), node('yes', 'action'), node('no', 'action'), node('end', 'action')],
  edges: [
    { id: 'a', source: 'trigger', target: 'condition' },
    { id: 'b', source: 'condition', sourceHandle: 'true', target: 'yes' },
    { id: 'c', source: 'condition', sourceHandle: 'false', target: 'no' },
    { id: 'd', source: 'yes', target: 'end' },
    { id: 'e', source: 'no', target: 'end' },
  ],
};
describe('workflow branching', () => {
  it.each([true, false])('runs the first action on the %s branch', async result => {
    const actions: string[] = [];
    await walkWorkflow(graph, 'trigger', { condition: () => result, action: async n => { actions.push(n.id); }, delay: vi.fn() });
    expect(actions).toEqual([result ? 'yes' : 'no', 'end']);
  });
  it('stops cycles instead of repeatedly performing mutations', async () => {
    const cyclic = { ...graph, edges: [...graph.edges, { id: 'cycle', source: 'end', target: 'condition' }] };
    const action = vi.fn();
    await expect(walkWorkflow(cyclic, 'trigger', { condition: () => true, action, delay: vi.fn() })).rejects.toThrow('cycle');
    expect(action).toHaveBeenCalledTimes(2);
  });
  it('executes a converging action once', async () => {
    const forked = { ...graph, edges: [...graph.edges, { id: 'fork', source: 'trigger', target: 'end' }] };
    const action = vi.fn();
    await walkWorkflow(forked, 'trigger', { condition: () => true, action, delay: vi.fn() });
    expect(action).toHaveBeenCalledTimes(2);
  });
});
