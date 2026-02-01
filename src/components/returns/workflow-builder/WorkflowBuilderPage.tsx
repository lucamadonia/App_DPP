import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  WorkflowGraph,
  WorkflowNode as NodeType,
  CanvasViewport,
  Position,
} from '@/types/workflow-builder';
import {
  getRhWorkflowRules,
  updateRhWorkflowRule,
} from '@/services/supabase';
import {
  serializeWorkflowGraph,
  deserializeWorkflowGraph,
} from '@/services/supabase/rh-workflows';
import type { RhWorkflowRule } from '@/types/returns-hub';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowNodePalette } from './WorkflowNodePalette';
import { WorkflowNodeConfig } from './WorkflowNodeConfig';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowMinimap } from './WorkflowMinimap';
import { generateEdgeId, autoLayoutGraph, createNode } from './workflowUtils';

const DEFAULT_VIEWPORT: CanvasViewport = { x: 40, y: 40, zoom: 1 };

function createEmptyGraph(): WorkflowGraph {
  return {
    _graphVersion: 2,
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
  };
}

/** Build a default graph for a legacy workflow rule (with just a trigger) */
function buildLegacyGraph(rule: RhWorkflowRule): WorkflowGraph {
  const triggerNode = createNode('trigger', { x: 80, y: 120 }, rule.triggerType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  // Set the trigger event type based on the legacy triggerType
  const eventMap: Record<string, string> = {
    return_created: 'return_created',
    status_changed: 'return_status_changed',
    return_overdue: 'return_overdue',
  };
  (triggerNode.data as { eventType: string }).eventType = eventMap[rule.triggerType] || 'return_created';

  return {
    _graphVersion: 2,
    nodes: [triggerNode],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
  };
}

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('returns');

  const [rule, setRule] = useState<RhWorkflowRule | null>(null);
  const [graph, setGraph] = useState<WorkflowGraph>(createEmptyGraph());
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>(DEFAULT_VIEWPORT);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Load workflow ----
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const rules = await getRhWorkflowRules();
      const found = rules.find((r) => r.id === id);
      if (!found) {
        navigate('/returns/workflows');
        return;
      }
      setRule(found);
      setName(found.name);

      // Try to deserialize graph
      const existingGraph = deserializeWorkflowGraph(found.conditions);
      if (existingGraph) {
        setGraph(existingGraph);
        setViewport(existingGraph.viewport);
      } else {
        // Legacy rule: build a default graph
        const legacy = buildLegacyGraph(found);
        setGraph(legacy);
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  // ---- Graph mutation helpers ----
  const updateGraph = useCallback((updater: (prev: WorkflowGraph) => WorkflowGraph) => {
    setGraph((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  }, []);

  const handleAddNode = useCallback(
    (node: NodeType) => {
      // Enforce max 1 trigger
      if (node.type === 'trigger') {
        const existingTrigger = graph.nodes.find((n) => n.type === 'trigger');
        if (existingTrigger) return;
      }
      updateGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [graph.nodes, updateGraph]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, position: Position) => {
      updateGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }));
    },
    [updateGraph]
  );

  const handleUpdateNode = useCallback(
    (updated: NodeType) => {
      updateGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === updated.id ? updated : n)),
      }));
    },
    [updateGraph]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      updateGraph((g) => ({
        ...g,
        nodes: g.nodes.filter((n) => n.id !== nodeId),
        edges: g.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      }));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId, updateGraph]
  );

  const handleAddEdge = useCallback(
    (source: string, target: string, sourceHandle?: 'true' | 'false') => {
      updateGraph((g) => ({
        ...g,
        edges: [...g.edges, { id: generateEdgeId(), source, target, sourceHandle }],
      }));
    },
    [updateGraph]
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) setSelectedEdgeId(null);
  }, []);

  const handleSelectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) setSelectedNodeId(null);
  }, []);

  // ---- Delete selected edge with keyboard ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete when focused on inputs
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (selectedEdgeId) {
          updateGraph((g) => ({
            ...g,
            edges: g.edges.filter((edge) => edge.id !== selectedEdgeId),
          }));
          setSelectedEdgeId(null);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedEdgeId, selectedNodeId, handleDeleteNode, updateGraph]);

  // ---- Save ----
  const handleSave = useCallback(async () => {
    if (!rule) return;
    setSaving(true);

    const graphToSave: WorkflowGraph = { ...graph, viewport };
    const { conditions, actions } = serializeWorkflowGraph(graphToSave);

    // Derive triggerType from the trigger node
    const triggerNode = graph.nodes.find((n) => n.type === 'trigger');
    const triggerType = triggerNode
      ? (triggerNode.data as { eventType: string }).eventType
      : rule.triggerType;

    await updateRhWorkflowRule(rule.id, {
      name,
      triggerType,
      conditions,
      actions,
    });

    setIsDirty(false);
    setSaving(false);
  }, [rule, graph, viewport, name]);

  // ---- Toolbar actions ----
  const handleZoomIn = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.min(2, v.zoom * 1.2) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.max(0.25, v.zoom / 1.2) }));
  }, []);

  const handleZoomReset = useCallback(() => {
    setViewport({ x: 40, y: 40, zoom: 1 });
  }, []);

  const handleAutoLayout = useCallback(() => {
    updateGraph((g) => autoLayoutGraph(g));
  }, [updateGraph]);

  const handleExport = useCallback(() => {
    const graphToExport: WorkflowGraph = { ...graph, viewport };
    const json = JSON.stringify(graphToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [graph, viewport, name]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string) as WorkflowGraph;
          if (imported._graphVersion === 2) {
            setGraph(imported);
            setViewport(imported.viewport);
            setIsDirty(true);
          }
        } catch {
          // invalid file
        }
      };
      reader.readAsText(file);
      // Reset so same file can be re-imported
      e.target.value = '';
    },
    []
  );

  // ---- Canvas dimensions for minimap ----
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ---- Render ----
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  const selectedNode = selectedNodeId
    ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 sm:-m-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <WorkflowToolbar
        name={name}
        active={rule?.active ?? false}
        isDirty={isDirty}
        saving={saving}
        zoom={viewport.zoom}
        onNameChange={(n) => { setName(n); setIsDirty(true); }}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <WorkflowNodePalette />

        {/* Center: Canvas */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <WorkflowCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            onMoveNode={handleMoveNode}
            onAddNode={handleAddNode}
            onAddEdge={handleAddEdge}
            viewport={viewport}
            onViewportChange={setViewport}
          />
          <WorkflowMinimap
            graph={graph}
            viewport={viewport}
            canvasWidth={canvasSize.w}
            canvasHeight={canvasSize.h}
          />
        </div>

        {/* Right: Config panel */}
        {selectedNode && (
          <WorkflowNodeConfig
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}
