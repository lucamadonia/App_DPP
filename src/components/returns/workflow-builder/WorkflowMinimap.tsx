import type { WorkflowGraph, CanvasViewport } from '@/types/workflow-builder';
import { NODE_COLORS, NODE_WIDTH, NODE_HEIGHT } from '@/types/workflow-builder';

interface WorkflowMinimapProps {
  graph: WorkflowGraph;
  viewport: CanvasViewport;
  canvasWidth: number;
  canvasHeight: number;
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;
const PADDING = 20;

export function WorkflowMinimap({ graph, viewport, canvasWidth, canvasHeight }: WorkflowMinimapProps) {
  if (graph.nodes.length === 0) return null;

  // Compute bounding box of all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of graph.nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  }

  // Add padding
  minX -= PADDING;
  minY -= PADDING;
  maxX += PADDING;
  maxY += PADDING;

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const scale = Math.min(MINIMAP_W / contentW, MINIMAP_H / contentH);

  // Viewport rectangle in content coords
  const vpLeft = (-viewport.x / viewport.zoom - minX) * scale;
  const vpTop = (-viewport.y / viewport.zoom - minY) * scale;
  const vpW = (canvasWidth / viewport.zoom) * scale;
  const vpH = (canvasHeight / viewport.zoom) * scale;

  return (
    <div className="absolute bottom-3 right-3 bg-card border rounded-lg shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        <rect width={MINIMAP_W} height={MINIMAP_H} fill="var(--color-background, #f8fafc)" />

        {/* Nodes */}
        {graph.nodes.map((node) => (
          <rect
            key={node.id}
            x={(node.position.x - minX) * scale}
            y={(node.position.y - minY) * scale}
            width={NODE_WIDTH * scale}
            height={NODE_HEIGHT * scale}
            rx={2}
            fill={NODE_COLORS[node.type]}
            opacity={0.7}
          />
        ))}

        {/* Viewport indicator */}
        <rect
          x={vpLeft}
          y={vpTop}
          width={vpW}
          height={vpH}
          fill="none"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth={1.5}
          rx={2}
          opacity={0.6}
        />
      </svg>
    </div>
  );
}
