import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkflowGraph, WorkflowNode as NodeType, Position, PaletteItemDragData } from '@/types/workflow-builder';
import { NODE_WIDTH, NODE_HEIGHT } from '@/types/workflow-builder';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowEdge, TempEdge } from './WorkflowEdge';
import { createNode, snapToGrid } from './workflowUtils';

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onMoveNode: (id: string, position: Position) => void;
  onAddNode: (node: NodeType) => void;
  onAddEdge: (source: string, target: string, sourceHandle?: 'true' | 'false') => void;
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (vp: { x: number; y: number; zoom: number }) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const GRID_SIZE = 20;

export function WorkflowCanvas({
  graph,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onAddNode,
  onAddEdge,
  viewport,
  onViewportChange,
}: WorkflowCanvasProps) {
  const { t } = useTranslation('returns');
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag state — offset is in canvas-space
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; vpX: number; vpY: number } | null>(null);

  // Connection drawing state
  const [connecting, setConnecting] = useState<{
    sourceId: string;
    handle?: 'true' | 'false';
    mousePos: Position;
  } | null>(null);

  // ---- Coordinate helpers ----
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): Position => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // ---- Pan ----
  const handleBgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      onSelectNode(null);
      onSelectEdge(null);
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        vpX: viewport.x,
        vpY: viewport.y,
      });
    },
    [viewport, onSelectNode, onSelectEdge]
  );

  // ---- Mouse move (pan / drag / connect) ----
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panning) {
        const dx = e.clientX - panning.startX;
        const dy = e.clientY - panning.startY;
        onViewportChange({ ...viewport, x: panning.vpX + dx, y: panning.vpY + dy });
        return;
      }
      if (dragging) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        const newPos = snapToGrid({
          x: canvasPos.x - dragging.offsetX,
          y: canvasPos.y - dragging.offsetY,
        });
        onMoveNode(dragging.nodeId, newPos);
        return;
      }
      if (connecting) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setConnecting({ ...connecting, mousePos: pos });
      }
    },
    [panning, dragging, connecting, viewport, screenToCanvas, onViewportChange, onMoveNode]
  );

  // ---- Mouse up ----
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (connecting) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const targetNode = graph.nodes.find(
          (n) =>
            n.id !== connecting.sourceId &&
            n.type !== 'trigger' &&
            pos.x >= n.position.x - 12 &&
            pos.x <= n.position.x + 12 &&
            pos.y >= n.position.y + NODE_HEIGHT / 2 - 12 &&
            pos.y <= n.position.y + NODE_HEIGHT / 2 + 12
        );

        if (targetNode) {
          const isDuplicate = graph.edges.some(
            (edge) =>
              edge.source === connecting.sourceId &&
              edge.target === targetNode.id &&
              edge.sourceHandle === connecting.handle
          );
          if (!isDuplicate) {
            onAddEdge(connecting.sourceId, targetNode.id, connecting.handle);
          }
        }

        setConnecting(null);
      }
      setPanning(null);
      setDragging(null);
    },
    [connecting, graph.nodes, graph.edges, screenToCanvas, onAddEdge]
  );

  // ---- Zoom ----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * delta));

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const newX = mx - (mx - viewport.x) * (newZoom / viewport.zoom);
      const newY = my - (my - viewport.y) * (newZoom / viewport.zoom);

      onViewportChange({ x: newX, y: newY, zoom: newZoom });
    },
    [viewport, onViewportChange]
  );

  // ---- Drop from palette ----
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      try {
        const dragData = JSON.parse(raw) as PaletteItemDragData;
        const pos = screenToCanvas(e.clientX, e.clientY);
        const snapped = snapToGrid({
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        });
        const node = createNode(dragData.type, snapped, dragData.label, dragData);
        onAddNode(node);
      } catch {
        // invalid data
      }
    },
    [screenToCanvas, onAddNode]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ---- Node interaction callbacks ----
  // New: receives the raw MouseEvent, computes offset in canvas coords
  const handleNodeDragStart = useCallback(
    (nodeId: string, startEvent: React.MouseEvent) => {
      const canvasPos = screenToCanvas(startEvent.clientX, startEvent.clientY);
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setDragging({
        nodeId,
        offsetX: canvasPos.x - node.position.x,
        offsetY: canvasPos.y - node.position.y,
      });
    },
    [graph.nodes, screenToCanvas]
  );

  const handleConnectionStart = useCallback(
    (nodeId: string, handle?: 'true' | 'false') => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const startX = node.position.x + NODE_WIDTH;
      let startY = node.position.y + NODE_HEIGHT / 2;
      if (node.type === 'condition' && handle) {
        startY = node.position.y + (handle === 'true' ? NODE_HEIGHT * 0.3 : NODE_HEIGHT * 0.7);
      }
      setConnecting({
        sourceId: nodeId,
        handle,
        mousePos: { x: startX, y: startY },
      });
    },
    [graph.nodes]
  );

  // Compute the source position for the temp edge
  const connectingFrom = connecting
    ? (() => {
        const node = graph.nodes.find((n) => n.id === connecting.sourceId);
        if (!node) return null;
        const x = node.position.x + NODE_WIDTH;
        let y = node.position.y + NODE_HEIGHT / 2;
        if (node.type === 'condition' && connecting.handle) {
          y = node.position.y + (connecting.handle === 'true' ? NODE_HEIGHT * 0.3 : NODE_HEIGHT * 0.7);
        }
        return { x, y };
      })()
    : null;

  const gridScaled = GRID_SIZE * viewport.zoom;
  const isEmpty = graph.nodes.length === 0;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full select-none"
      style={{ touchAction: 'none' }}
      onMouseDown={handleBgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Grid background pattern */}
      <defs>
        <pattern
          id="grid-dots"
          width={gridScaled}
          height={gridScaled}
          patternUnits="userSpaceOnUse"
          x={viewport.x % gridScaled}
          y={viewport.y % gridScaled}
        >
          <circle
            cx={gridScaled / 2}
            cy={gridScaled / 2}
            r={1}
            fill="var(--color-muted-foreground, #94a3b8)"
            opacity={0.3}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="var(--color-background, #f8fafc)" />
      <rect width="100%" height="100%" fill="url(#grid-dots)" />

      {/* Empty state */}
      {isEmpty && (
        <foreignObject x="0" y="0" width="100%" height="100%">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '32px',
                borderRadius: '12px',
                border: '2px dashed var(--color-border, #e2e8f0)',
                backgroundColor: 'var(--color-card, rgba(255,255,255,0.6))',
                maxWidth: '360px',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-foreground, #1a1a2e)', marginBottom: 8 }}>
                {t('Drag nodes from palette')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted-foreground, #64748b)' }}>
                {t('Start by dragging a trigger node onto the canvas, then add conditions and actions.')}
              </div>
            </div>
          </div>
        </foreignObject>
      )}

      {/* Transformed content */}
      <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
        {/* Edges */}
        {graph.edges.map((edge) => (
          <WorkflowEdge
            key={edge.id}
            edge={edge}
            nodes={graph.nodes}
            selected={selectedEdgeId === edge.id}
            onSelect={onSelectEdge}
          />
        ))}

        {/* Temp connection line */}
        {connecting && connectingFrom && (
          <TempEdge from={connectingFrom} to={connecting.mousePos} />
        )}

        {/* Nodes */}
        {graph.nodes.map((node) => (
          <WorkflowNode
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onSelect={onSelectNode}
            onDragStart={handleNodeDragStart}
            onConnectionStart={handleConnectionStart}
          />
        ))}
      </g>
    </svg>
  );
}
