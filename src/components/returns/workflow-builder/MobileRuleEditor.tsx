import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  GitBranch,
  Play,
  Clock,
  MoreVertical,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  ArrowDown,
  Eye,
} from 'lucide-react';
import type {
  WorkflowGraph,
  WorkflowNode as NodeType,
  WorkflowNodeType,
  WorkflowEdge,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
} from '@/types/workflow-builder';
import { NODE_COLORS } from '@/types/workflow-builder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { WorkflowNodeConfig } from './WorkflowNodeConfig';
import { WorkflowNodePalette } from './WorkflowNodePalette';
import { ACTION_TYPE_LABELS, TRIGGER_TYPE_LABELS } from './workflowUtils';
import { cn } from '@/lib/utils';

const NODE_ICONS: Record<WorkflowNodeType, React.ComponentType<{ className?: string }>> = {
  trigger: Zap,
  condition: GitBranch,
  action: Play,
  delay: Clock,
};

interface MobileRuleEditorProps {
  graph: WorkflowGraph;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (node: NodeType) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: (node: NodeType) => void;
  onAddEdge: (source: string, target: string, sourceHandle?: 'true' | 'false') => void;
  onViewGraph: () => void;
}

type LinearStep =
  | { kind: 'node'; node: NodeType; depth: number; branch?: 'true' | 'false' }
  | { kind: 'no-next'; afterNodeId: string; depth: number; branch?: 'true' | 'false' };

/**
 * Detect if the graph is a simple tree (one root, no merges).
 * Returns true if every non-trigger node has exactly 0 or 1 incoming edge.
 */
function isLinearOrTree(graph: WorkflowGraph): boolean {
  const inCount = new Map<string, number>();
  for (const edge of graph.edges) {
    inCount.set(edge.target, (inCount.get(edge.target) ?? 0) + 1);
  }
  for (const node of graph.nodes) {
    if (node.type === 'trigger') continue;
    if ((inCount.get(node.id) ?? 0) > 1) return false;
  }
  return true;
}

/** BFS linearization from trigger node, with branch labels for conditions */
function linearize(graph: WorkflowGraph): LinearStep[] {
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  if (!trigger) return [];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgesFrom = new Map<string, WorkflowEdge[]>();
  for (const e of graph.edges) {
    if (!edgesFrom.has(e.source)) edgesFrom.set(e.source, []);
    edgesFrom.get(e.source)!.push(e);
  }
  const steps: LinearStep[] = [];
  const visited = new Set<string>();

  function walk(
    nodeId: string,
    depth: number,
    branch?: 'true' | 'false'
  ) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = byId.get(nodeId);
    if (!node) return;
    steps.push({ kind: 'node', node, depth, branch });

    const outgoing = edgesFrom.get(nodeId) ?? [];

    if (node.type === 'condition') {
      // Render true branch first, then false branch
      const trueEdge = outgoing.find((e) => e.sourceHandle === 'true');
      const falseEdge = outgoing.find((e) => e.sourceHandle === 'false');
      if (trueEdge) walk(trueEdge.target, depth + 1, 'true');
      else steps.push({ kind: 'no-next', afterNodeId: nodeId, depth: depth + 1, branch: 'true' });
      if (falseEdge) walk(falseEdge.target, depth + 1, 'false');
      else steps.push({ kind: 'no-next', afterNodeId: nodeId, depth: depth + 1, branch: 'false' });
    } else {
      const next = outgoing[0];
      if (next) walk(next.target, depth);
    }
  }

  walk(trigger.id, 0);
  return steps;
}

function getNodeSummary(node: NodeType, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (node.type === 'trigger') {
    const data = node.data as TriggerNodeData;
    return TRIGGER_TYPE_LABELS[data.eventType] || data.eventType;
  }
  if (node.type === 'condition') {
    const data = node.data as ConditionNodeData;
    const count = data.conditions.length;
    return t('Step {{n}}', { n: count }) + ` (${data.logicOperator})`;
  }
  if (node.type === 'action') {
    const data = node.data as ActionNodeData;
    return ACTION_TYPE_LABELS[data.actionType] || data.actionType;
  }
  if (node.type === 'delay') {
    const data = node.data as DelayNodeData;
    return `${data.amount} ${data.unit}`;
  }
  return '';
}

export function MobileRuleEditor({
  graph,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onDeleteNode,
  onAddNode,
  onAddEdge,
  onViewGraph,
}: MobileRuleEditorProps) {
  const { t } = useTranslation('returns');
  const { t: tc } = useTranslation('common');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addAfterNode, setAddAfterNode] = useState<{
    id: string;
    branch?: 'true' | 'false';
  } | null>(null);

  const linear = useMemo(() => linearize(graph), [graph]);
  const isSimple = useMemo(() => isLinearOrTree(graph), [graph]);

  const selectedNode = selectedNodeId
    ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const trigger = graph.nodes.find((n) => n.type === 'trigger');

  if (!isSimple) {
    return (
      <div className="p-4 space-y-4">
        <Card className="p-5 border-warning/40 bg-warning/5 gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1 min-w-0">
              <h3 className="font-semibold text-sm">
                {t('Complex graph — view on desktop')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  'This workflow has branches that merge back together, which can\'t be edited on mobile. Please switch to desktop to edit.'
                )}
              </p>
              <Button variant="outline" size="sm" onClick={onViewGraph} className="mt-2">
                <Eye className="size-4 mr-2" />
                {t('View graph (read-only)')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!trigger) {
    return (
      <div className="p-4 space-y-4">
        <Card className="p-5 border-dashed gap-3">
          <div className="text-center space-y-2">
            <Zap className="size-10 mx-auto text-muted-foreground" />
            <h3 className="font-semibold text-sm">
              {t('Best edited on desktop')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('Start by adding a trigger node on desktop, then return here to tweak steps.')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const handleRequestAddAfter = (afterNodeId: string, branch?: 'true' | 'false') => {
    setAddAfterNode({ id: afterNodeId, branch });
    setPaletteOpen(true);
  };

  const handleAddFromPalette = (newNode: NodeType) => {
    onAddNode(newNode);
    if (addAfterNode) {
      onAddEdge(addAfterNode.id, newNode.id, addAfterNode.branch);
      setAddAfterNode(null);
    }
    setPaletteOpen(false);
  };

  return (
    <div className="p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {t('Tap a step to edit. Add steps between existing ones.')}
        </div>
        <Button variant="ghost" size="sm" onClick={onViewGraph} className="text-xs h-7">
          <Eye className="size-3.5 mr-1" />
          {t('View graph (read-only)')}
        </Button>
      </div>

      {linear.map((step, idx) => {
        if (step.kind === 'no-next') {
          return (
            <div
              key={`no-next-${step.afterNodeId}-${step.branch}-${idx}`}
              className="flex items-start gap-2"
              style={{ paddingLeft: step.depth * 16 }}
            >
              <div className="flex flex-col items-center pt-1">
                <ArrowDown className="size-3 text-muted-foreground/50" />
              </div>
              <div className="flex-1">
                {step.branch && (
                  <Badge variant="outline" className="text-[10px] mb-1">
                    {step.branch === 'true' ? t('Yes branch') : t('No branch')}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRequestAddAfter(step.afterNodeId, step.branch)}
                  className="w-full border-dashed h-10 text-muted-foreground"
                >
                  <Plus className="size-4 mr-1.5" />
                  {t('Add step after this')}
                </Button>
              </div>
            </div>
          );
        }

        const { node, depth, branch } = step;
        const Icon = NODE_ICONS[node.type];
        const color = NODE_COLORS[node.type];
        const summary = getNodeSummary(node, t);
        const isLast =
          idx === linear.length - 1 ||
          (linear[idx + 1]?.kind === 'node' && linear[idx + 1].depth < depth);

        return (
          <div key={node.id}>
            {depth > 0 && idx > 0 && (
              <div
                className="flex items-center gap-2 py-0.5"
                style={{ paddingLeft: depth * 16 }}
              >
                <ArrowDown className="size-3 text-muted-foreground/60" />
                {branch && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      branch === 'true'
                        ? 'border-success/30 text-success-foreground bg-success/10'
                        : 'border-destructive/30 text-destructive bg-destructive/10'
                    )}
                  >
                    {branch === 'true' ? t('Yes branch') : t('No branch')}
                  </Badge>
                )}
              </div>
            )}
            <div style={{ paddingLeft: depth * 16 }}>
              <Card
                className={cn(
                  'p-3 gap-2 cursor-pointer transition-all',
                  selectedNodeId === node.id && 'ring-2 ring-primary'
                )}
                onClick={() => onSelectNode(node.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                        {node.type}
                      </span>
                    </div>
                    <div className="font-semibold text-sm truncate">{node.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{summary}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-8 touch-target">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectNode(node.id)}>
                        <Edit3 className="size-4 mr-2" />
                        {tc('Edit')}
                      </DropdownMenuItem>
                      {node.type !== 'trigger' && (
                        <DropdownMenuItem
                          onClick={() => onDeleteNode(node.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          {tc('Delete')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </div>

            {/* "Add step after" button for leaf nodes of simple chains */}
            {node.type !== 'condition' && isLast && (
              <div
                className="flex items-start gap-2 mt-2"
                style={{ paddingLeft: depth * 16 }}
              >
                <div className="flex flex-col items-center pt-1">
                  <ArrowDown className="size-3 text-muted-foreground/50" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRequestAddAfter(node.id)}
                  className="flex-1 border-dashed h-10 text-muted-foreground"
                >
                  <Plus className="size-4 mr-1.5" />
                  {t('Add step after this')}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Node edit drawer */}
      <MobileDrawer
        open={!!selectedNode}
        onOpenChange={(open) => {
          if (!open) onSelectNode(null);
        }}
        title={selectedNode?.label}
        side="bottom"
        maxHeight="90vh"
      >
        {selectedNode && (
          <div className="-mx-4">
            <WorkflowNodeConfig
              node={selectedNode}
              onUpdate={(updated) => onUpdateNode(updated)}
              onDelete={(id) => {
                onDeleteNode(id);
                onSelectNode(null);
              }}
            />
          </div>
        )}
      </MobileDrawer>

      {/* Palette drawer for adding new steps */}
      <MobileDrawer
        open={paletteOpen}
        onOpenChange={(open) => {
          setPaletteOpen(open);
          if (!open) setAddAfterNode(null);
        }}
        title={t('Add step')}
        side="bottom"
        maxHeight="80vh"
      >
        <div className="-mx-4">
          <MobilePalette onAdd={handleAddFromPalette} />
        </div>
      </MobileDrawer>
    </div>
  );
}

/**
 * Simplified palette for mobile — shows the available node types as big cards,
 * tapping one creates a node and inserts it into the graph.
 */
function MobilePalette({ onAdd }: { onAdd: (node: NodeType) => void }) {
  // Delegate to the existing palette which already has all the node types.
  // We wrap it so the palette's drag handlers fall through to click behavior
  // (since drag doesn't work well on touch without additional sensors).
  return (
    <div className="pb-4">
      <WorkflowNodePalette mobileMode onSelect={onAdd} />
    </div>
  );
}
