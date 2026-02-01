import { useCallback } from 'react';
import type { WorkflowEdge as EdgeType, WorkflowNode, Position } from '@/types/workflow-builder';
import { NODE_WIDTH, NODE_HEIGHT } from '@/types/workflow-builder';

interface WorkflowEdgeProps {
  edge: EdgeType;
  nodes: WorkflowNode[];
  selected: boolean;
  onSelect: (id: string) => void;
}

function getSourcePosition(node: WorkflowNode, handle?: 'true' | 'false'): Position {
  const x = node.position.x + NODE_WIDTH;
  if (node.type === 'condition' && handle) {
    // True handle top-right, False handle bottom-right
    const yOffset = handle === 'true' ? NODE_HEIGHT * 0.3 : NODE_HEIGHT * 0.7;
    return { x, y: node.position.y + yOffset };
  }
  return { x, y: node.position.y + NODE_HEIGHT / 2 };
}

function getTargetPosition(node: WorkflowNode): Position {
  return { x: node.position.x, y: node.position.y + NODE_HEIGHT / 2 };
}

function getBezierPath(from: Position, to: Position): string {
  const dx = Math.abs(to.x - from.x);
  const cp = Math.max(dx * 0.5, 50);
  return `M ${from.x} ${from.y} C ${from.x + cp} ${from.y}, ${to.x - cp} ${to.y}, ${to.x} ${to.y}`;
}

export function WorkflowEdge({ edge, nodes, selected, onSelect }: WorkflowEdgeProps) {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(edge.id);
    },
    [edge.id, onSelect]
  );

  if (!sourceNode || !targetNode) return null;

  const from = getSourcePosition(sourceNode, edge.sourceHandle);
  const to = getTargetPosition(targetNode);
  const path = getBezierPath(from, to);

  let strokeColor = '#94a3b8'; // gray
  if (edge.sourceHandle === 'true') strokeColor = '#10B981';
  if (edge.sourceHandle === 'false') strokeColor = '#EF4444';

  return (
    <g>
      {/* Invisible wider hit area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="cursor-pointer"
        onClick={handleClick}
      />
      {/* Visible edge */}
      <path
        d={path}
        fill="none"
        stroke={selected ? '#6366f1' : strokeColor}
        strokeWidth={selected ? 2.5 : 2}
        strokeLinecap="round"
        className="pointer-events-none"
      />
      {/* Arrowhead */}
      <polygon
        points={`${to.x},${to.y} ${to.x - 8},${to.y - 4} ${to.x - 8},${to.y + 4}`}
        fill={selected ? '#6366f1' : strokeColor}
        className="pointer-events-none"
      />
    </g>
  );
}

// Temporary edge while dragging a new connection
export function TempEdge({ from, to }: { from: Position; to: Position }) {
  const path = getBezierPath(from, to);
  return (
    <path
      d={path}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={2}
      strokeDasharray="6 4"
      className="pointer-events-none"
    />
  );
}
