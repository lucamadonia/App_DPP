import { useCallback, useMemo } from 'react';
import {
  Zap, GitBranch, Play, Clock,
  CheckCircle, XCircle, Mail, Webhook,
  UserPlus, StickyNote, AlertTriangle,
  Bell, ListPlus, Edit, Tag, TicketCheck,
} from 'lucide-react';
import type { WorkflowNode as NodeType, WorkflowNodeType, ActionNodeData, TriggerNodeData, WorkflowActionType, TriggerEventType } from '@/types/workflow-builder';
import { NODE_COLORS, NODE_WIDTH, NODE_HEIGHT } from '@/types/workflow-builder';
import { ACTION_TYPE_LABELS, TRIGGER_TYPE_LABELS } from './workflowUtils';

interface WorkflowNodeProps {
  node: NodeType;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, startEvent: React.MouseEvent) => void;
  onConnectionStart: (nodeId: string, handle?: 'true' | 'false') => void;
}

const BASE_ICONS: Record<WorkflowNodeType, typeof Zap> = {
  trigger: Zap,
  condition: GitBranch,
  action: Play,
  delay: Clock,
};

const ACTION_ICONS: Partial<Record<WorkflowActionType, typeof Zap>> = {
  approve: CheckCircle,
  reject: XCircle,
  assign: UserPlus,
  add_note: StickyNote,
  update_field: Edit,
  set_priority: AlertTriangle,
  ticket_create: ListPlus,
  ticket_assign: UserPlus,
  ticket_add_message: StickyNote,
  ticket_set_priority: AlertTriangle,
  ticket_add_tag: Tag,
  email_send_template: Mail,
  email_send_custom: Mail,
  notification_internal: Bell,
  webhook_call: Webhook,
  timeline_add_entry: ListPlus,
  customer_add_tag: Tag,
  customer_update_risk_score: AlertTriangle,
  customer_update_notes: StickyNote,
};

const TRIGGER_ICONS: Partial<Record<TriggerEventType, typeof Zap>> = {
  return_overdue: AlertTriangle,
  ticket_created: TicketCheck,
  ticket_status_changed: TicketCheck,
  ticket_overdue: AlertTriangle,
  customer_risk_changed: AlertTriangle,
  customer_tag_added: Tag,
  scheduled_daily: Clock,
  scheduled_weekly: Clock,
  scheduled_monthly: Clock,
  manual: Play,
};

const HANDLE_RADIUS = 6;

export function WorkflowNode({
  node,
  selected,
  onSelect,
  onDragStart,
  onConnectionStart,
}: WorkflowNodeProps) {
  const color = NODE_COLORS[node.type];

  // Resolve subtype-specific icon and label
  const { Icon, subtypeLabel } = useMemo(() => {
    if (node.type === 'action') {
      const actionType = (node.data as ActionNodeData).actionType;
      return {
        Icon: ACTION_ICONS[actionType] || BASE_ICONS.action,
        subtypeLabel: ACTION_TYPE_LABELS[actionType] || 'Action',
      };
    }
    if (node.type === 'trigger') {
      const eventType = (node.data as TriggerNodeData).eventType;
      return {
        Icon: TRIGGER_ICONS[eventType] || BASE_ICONS.trigger,
        subtypeLabel: TRIGGER_TYPE_LABELS[eventType] || 'Trigger',
      };
    }
    return {
      Icon: BASE_ICONS[node.type],
      subtypeLabel: node.type.charAt(0).toUpperCase() + node.type.slice(1),
    };
  }, [node.type, node.data]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.handle')) return;
      e.stopPropagation();
      onSelect(node.id);
      onDragStart(node.id, e);
    },
    [node.id, onSelect, onDragStart]
  );

  const handleOutputMouseDown = useCallback(
    (e: React.MouseEvent, handle?: 'true' | 'false') => {
      e.stopPropagation();
      onConnectionStart(node.id, handle);
    },
    [node.id, onConnectionStart]
  );

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={handleMouseDown}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Shadow */}
      <rect
        x={1}
        y={2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill="rgba(0,0,0,0.08)"
      />
      {/* Body */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill="var(--color-card, #ffffff)"
        stroke={selected ? '#6366f1' : 'var(--color-border, #e2e8f0)'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* Rounded top accent */}
      <path
        d={`M 8 0 H ${NODE_WIDTH - 8} Q ${NODE_WIDTH} 0 ${NODE_WIDTH} 4 H 0 Q 0 0 8 0 Z`}
        fill={color}
      />

      {/* Icon + Label via foreignObject */}
      <foreignObject x={0} y={4} width={NODE_WIDTH} height={NODE_HEIGHT - 4}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            height: '100%',
            fontFamily: 'inherit',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={15} color={color} />
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-foreground, #1a1a2e)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--color-muted-foreground, #64748b)',
              }}
            >
              {subtypeLabel}
            </div>
          </div>
        </div>
      </foreignObject>

      {/* Input handle (left) — not for triggers */}
      {node.type !== 'trigger' && (
        <circle
          className="handle"
          cx={0}
          cy={NODE_HEIGHT / 2}
          r={HANDLE_RADIUS}
          fill="var(--color-card, #ffffff)"
          stroke="var(--color-border, #94a3b8)"
          strokeWidth={1.5}
          style={{ cursor: 'crosshair' }}
        />
      )}

      {/* Output handles (right) */}
      {node.type === 'condition' ? (
        <>
          {/* True handle */}
          <circle
            className="handle"
            cx={NODE_WIDTH}
            cy={NODE_HEIGHT * 0.3}
            r={HANDLE_RADIUS}
            fill="#10B981"
            stroke="#059669"
            strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => handleOutputMouseDown(e, 'true')}
          />
          <text
            x={NODE_WIDTH + 12}
            y={NODE_HEIGHT * 0.3 + 4}
            fontSize={9}
            fill="#10B981"
            fontWeight={600}
          >
            T
          </text>
          {/* False handle */}
          <circle
            className="handle"
            cx={NODE_WIDTH}
            cy={NODE_HEIGHT * 0.7}
            r={HANDLE_RADIUS}
            fill="#EF4444"
            stroke="#DC2626"
            strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => handleOutputMouseDown(e, 'false')}
          />
          <text
            x={NODE_WIDTH + 12}
            y={NODE_HEIGHT * 0.7 + 4}
            fontSize={9}
            fill="#EF4444"
            fontWeight={600}
          >
            F
          </text>
        </>
      ) : (
        <circle
          className="handle"
          cx={NODE_WIDTH}
          cy={NODE_HEIGHT / 2}
          r={HANDLE_RADIUS}
          fill="var(--color-card, #ffffff)"
          stroke="var(--color-border, #94a3b8)"
          strokeWidth={1.5}
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => handleOutputMouseDown(e)}
        />
      )}
    </g>
  );
}
