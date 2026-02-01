import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap, GitBranch, Play, Clock,
  ChevronRight, ChevronDown,
  Package, TicketCheck, Users, Mail, Webhook,
  CheckCircle, XCircle, UserPlus, StickyNote,
  AlertTriangle, Bell, ListPlus, Edit, Tag,
} from 'lucide-react';
import type { WorkflowNodeType, WorkflowActionType, TriggerEventType } from '@/types/workflow-builder';

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  icon: typeof Zap;
  color: string;
  defaultLabel?: string;
  actionType?: WorkflowActionType;
  eventType?: TriggerEventType;
}

interface PaletteCategory {
  key: string;
  label: string;
  icon: typeof Zap;
  items: PaletteItem[];
}

const CATEGORIES: PaletteCategory[] = [
  {
    key: 'triggers',
    label: 'Triggers',
    icon: Zap,
    items: [
      { type: 'trigger', label: 'Return Created', icon: Zap, color: '#10B981', defaultLabel: 'Return Created', eventType: 'return_created' },
      { type: 'trigger', label: 'Status Changed', icon: Zap, color: '#10B981', defaultLabel: 'Status Changed', eventType: 'return_status_changed' },
      { type: 'trigger', label: 'Return Overdue', icon: AlertTriangle, color: '#10B981', defaultLabel: 'Return Overdue', eventType: 'return_overdue' },
      { type: 'trigger', label: 'Ticket Created', icon: TicketCheck, color: '#10B981', defaultLabel: 'Ticket Created', eventType: 'ticket_created' },
      { type: 'trigger', label: 'Ticket Status Changed', icon: TicketCheck, color: '#10B981', defaultLabel: 'Ticket Status Changed', eventType: 'ticket_status_changed' },
      { type: 'trigger', label: 'Ticket Overdue', icon: AlertTriangle, color: '#10B981', defaultLabel: 'Ticket Overdue', eventType: 'ticket_overdue' },
      { type: 'trigger', label: 'Risk Score Changed', icon: Users, color: '#10B981', defaultLabel: 'Risk Score Changed', eventType: 'customer_risk_changed' },
      { type: 'trigger', label: 'Customer Tag Added', icon: Tag, color: '#10B981', defaultLabel: 'Customer Tag Added', eventType: 'customer_tag_added' },
      { type: 'trigger', label: 'Daily Schedule', icon: Clock, color: '#10B981', defaultLabel: 'Daily Schedule', eventType: 'scheduled_daily' },
      { type: 'trigger', label: 'Weekly Schedule', icon: Clock, color: '#10B981', defaultLabel: 'Weekly Schedule', eventType: 'scheduled_weekly' },
      { type: 'trigger', label: 'Monthly Schedule', icon: Clock, color: '#10B981', defaultLabel: 'Monthly Schedule', eventType: 'scheduled_monthly' },
      { type: 'trigger', label: 'Manual Trigger', icon: Play, color: '#10B981', defaultLabel: 'Manual Trigger', eventType: 'manual' },
    ],
  },
  {
    key: 'logic',
    label: 'Logic',
    icon: GitBranch,
    items: [
      { type: 'condition', label: 'Condition (If/Else)', icon: GitBranch, color: '#F59E0B', defaultLabel: 'Condition' },
      { type: 'delay', label: 'Delay (Wait)', icon: Clock, color: '#8B5CF6', defaultLabel: 'Delay' },
    ],
  },
  {
    key: 'return_actions',
    label: 'Return Actions',
    icon: Package,
    items: [
      { type: 'action', label: 'Set Status', icon: Play, color: '#3B82F6', defaultLabel: 'Set Status', actionType: 'set_status' },
      { type: 'action', label: 'Approve', icon: CheckCircle, color: '#3B82F6', defaultLabel: 'Approve', actionType: 'approve' },
      { type: 'action', label: 'Reject', icon: XCircle, color: '#3B82F6', defaultLabel: 'Reject', actionType: 'reject' },
      { type: 'action', label: 'Assign', icon: UserPlus, color: '#3B82F6', defaultLabel: 'Assign', actionType: 'assign' },
      { type: 'action', label: 'Set Priority', icon: AlertTriangle, color: '#3B82F6', defaultLabel: 'Set Priority', actionType: 'set_priority' },
      { type: 'action', label: 'Add Note', icon: StickyNote, color: '#3B82F6', defaultLabel: 'Add Note', actionType: 'add_note' },
      { type: 'action', label: 'Update Field', icon: Edit, color: '#3B82F6', defaultLabel: 'Update Field', actionType: 'update_field' },
    ],
  },
  {
    key: 'ticket_actions',
    label: 'Ticket Actions',
    icon: TicketCheck,
    items: [
      { type: 'action', label: 'Create Ticket', icon: ListPlus, color: '#3B82F6', defaultLabel: 'Create Ticket', actionType: 'ticket_create' },
      { type: 'action', label: 'Ticket Status', icon: Play, color: '#3B82F6', defaultLabel: 'Ticket Status', actionType: 'ticket_set_status' },
      { type: 'action', label: 'Ticket Priority', icon: AlertTriangle, color: '#3B82F6', defaultLabel: 'Ticket Priority', actionType: 'ticket_set_priority' },
      { type: 'action', label: 'Ticket Assign', icon: UserPlus, color: '#3B82F6', defaultLabel: 'Ticket Assign', actionType: 'ticket_assign' },
      { type: 'action', label: 'Ticket Message', icon: StickyNote, color: '#3B82F6', defaultLabel: 'Ticket Message', actionType: 'ticket_add_message' },
      { type: 'action', label: 'Ticket Tag', icon: Tag, color: '#3B82F6', defaultLabel: 'Ticket Tag', actionType: 'ticket_add_tag' },
    ],
  },
  {
    key: 'customer_actions',
    label: 'Customer Actions',
    icon: Users,
    items: [
      { type: 'action', label: 'Update Risk Score', icon: AlertTriangle, color: '#3B82F6', defaultLabel: 'Update Risk Score', actionType: 'customer_update_risk_score' },
      { type: 'action', label: 'Customer Tag', icon: Tag, color: '#3B82F6', defaultLabel: 'Customer Tag', actionType: 'customer_add_tag' },
      { type: 'action', label: 'Update Notes', icon: StickyNote, color: '#3B82F6', defaultLabel: 'Update Notes', actionType: 'customer_update_notes' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Mail,
    items: [
      { type: 'action', label: 'Send Email Template', icon: Mail, color: '#3B82F6', defaultLabel: 'Send Email Template', actionType: 'email_send_template' },
      { type: 'action', label: 'Send Custom Email', icon: Mail, color: '#3B82F6', defaultLabel: 'Send Custom Email', actionType: 'email_send_custom' },
      { type: 'action', label: 'Internal Notification', icon: Bell, color: '#3B82F6', defaultLabel: 'Internal Notification', actionType: 'notification_internal' },
    ],
  },
  {
    key: 'utility',
    label: 'Utility',
    icon: Webhook,
    items: [
      { type: 'action', label: 'Webhook', icon: Webhook, color: '#3B82F6', defaultLabel: 'Webhook', actionType: 'webhook_call' },
      { type: 'action', label: 'Timeline Entry', icon: ListPlus, color: '#3B82F6', defaultLabel: 'Timeline Entry', actionType: 'timeline_add_entry' },
    ],
  },
];

interface PaletteDraggableItemProps {
  item: PaletteItem;
}

function PaletteDraggableItem({ item }: PaletteDraggableItemProps) {
  const { t } = useTranslation('returns');
  const Icon = item.icon;

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const dragData = {
        type: item.type,
        label: item.defaultLabel || item.label,
        ...(item.actionType && { actionType: item.actionType }),
        ...(item.eventType && { eventType: item.eventType }),
      };
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [item]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing text-sm transition-colors"
    >
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${item.color}18` }}
      >
        <Icon size={12} color={item.color} />
      </div>
      <span className="truncate text-xs">{t(item.label)}</span>
    </div>
  );
}

export function WorkflowNodePalette() {
  const { t } = useTranslation('returns');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    triggers: true,
    logic: true,
    return_actions: true,
  });

  const toggleCategory = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="w-56 border-r bg-card overflow-y-auto flex flex-col">
      <div className="px-3 py-2.5 border-b">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          {t('Node Palette')}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const isExpanded = expanded[cat.key] ?? false;
          return (
            <div key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md hover:bg-accent text-xs font-medium text-muted-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <CatIcon size={12} />
                <span>{t(cat.label)}</span>
              </button>
              {isExpanded && (
                <div className="ml-3 space-y-0.5">
                  {cat.items.map((item, i) => (
                    <PaletteDraggableItem key={`${cat.key}-${i}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
