import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap, GitBranch, Play, Clock,
  ChevronRight, ChevronDown,
  Package, TicketCheck, Users, Mail, Webhook,
} from 'lucide-react';
import type { WorkflowNodeType } from '@/types/workflow-builder';

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  icon: typeof Zap;
  color: string;
  defaultLabel?: string;
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
      { type: 'trigger', label: 'Return Created', icon: Zap, color: '#10B981', defaultLabel: 'Return Created' },
      { type: 'trigger', label: 'Status Changed', icon: Zap, color: '#10B981', defaultLabel: 'Status Changed' },
      { type: 'trigger', label: 'Return Overdue', icon: Zap, color: '#10B981', defaultLabel: 'Return Overdue' },
      { type: 'trigger', label: 'Ticket Created', icon: Zap, color: '#10B981', defaultLabel: 'Ticket Created' },
      { type: 'trigger', label: 'Scheduled', icon: Clock, color: '#10B981', defaultLabel: 'Scheduled' },
      { type: 'trigger', label: 'Manual', icon: Zap, color: '#10B981', defaultLabel: 'Manual Trigger' },
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
      { type: 'action', label: 'Set Status', icon: Play, color: '#3B82F6', defaultLabel: 'Set Status' },
      { type: 'action', label: 'Approve', icon: Play, color: '#3B82F6', defaultLabel: 'Approve' },
      { type: 'action', label: 'Reject', icon: Play, color: '#3B82F6', defaultLabel: 'Reject' },
      { type: 'action', label: 'Assign', icon: Play, color: '#3B82F6', defaultLabel: 'Assign' },
      { type: 'action', label: 'Set Priority', icon: Play, color: '#3B82F6', defaultLabel: 'Set Priority' },
      { type: 'action', label: 'Add Note', icon: Play, color: '#3B82F6', defaultLabel: 'Add Note' },
    ],
  },
  {
    key: 'ticket_actions',
    label: 'Ticket Actions',
    icon: TicketCheck,
    items: [
      { type: 'action', label: 'Create Ticket', icon: Play, color: '#3B82F6', defaultLabel: 'Create Ticket' },
      { type: 'action', label: 'Ticket Status', icon: Play, color: '#3B82F6', defaultLabel: 'Ticket Status' },
      { type: 'action', label: 'Ticket Message', icon: Play, color: '#3B82F6', defaultLabel: 'Ticket Message' },
      { type: 'action', label: 'Ticket Tag', icon: Play, color: '#3B82F6', defaultLabel: 'Ticket Tag' },
    ],
  },
  {
    key: 'customer_actions',
    label: 'Customer Actions',
    icon: Users,
    items: [
      { type: 'action', label: 'Update Risk Score', icon: Play, color: '#3B82F6', defaultLabel: 'Update Risk Score' },
      { type: 'action', label: 'Customer Tag', icon: Play, color: '#3B82F6', defaultLabel: 'Customer Tag' },
      { type: 'action', label: 'Update Notes', icon: Play, color: '#3B82F6', defaultLabel: 'Update Notes' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Mail,
    items: [
      { type: 'action', label: 'Send Email Template', icon: Mail, color: '#3B82F6', defaultLabel: 'Send Email Template' },
      { type: 'action', label: 'Send Custom Email', icon: Mail, color: '#3B82F6', defaultLabel: 'Send Custom Email' },
      { type: 'action', label: 'Internal Notification', icon: Mail, color: '#3B82F6', defaultLabel: 'Internal Notification' },
    ],
  },
  {
    key: 'utility',
    label: 'Utility',
    icon: Webhook,
    items: [
      { type: 'action', label: 'Webhook', icon: Webhook, color: '#3B82F6', defaultLabel: 'Webhook' },
      { type: 'action', label: 'Timeline Entry', icon: Play, color: '#3B82F6', defaultLabel: 'Timeline Entry' },
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
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({ type: item.type, label: item.defaultLabel || item.label })
      );
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
