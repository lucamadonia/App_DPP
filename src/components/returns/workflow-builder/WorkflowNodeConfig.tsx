import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TriggerConfigurator } from './TriggerConfigurator';
import { ConditionBuilder } from './ConditionBuilder';
import { ActionConfigurator } from './ActionConfigurator';
import type {
  WorkflowNode,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
  DelayNodeData,
  DelayUnit,
} from '@/types/workflow-builder';
import { NODE_COLORS } from '@/types/workflow-builder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkflowNodeConfigProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
  onDelete: (id: string) => void;
}

export function WorkflowNodeConfig({ node, onUpdate, onDelete }: WorkflowNodeConfigProps) {
  const { t } = useTranslation('returns');
  const color = NODE_COLORS[node.type];

  const handleLabelChange = (label: string) => {
    onUpdate({ ...node, label });
  };

  const renderConfigurator = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <TriggerConfigurator
            data={node.data as TriggerNodeData}
            onChange={(data) => onUpdate({ ...node, data })}
          />
        );
      case 'condition':
        return (
          <ConditionBuilder
            data={node.data as ConditionNodeData}
            onChange={(data) => onUpdate({ ...node, data })}
          />
        );
      case 'action':
        return (
          <ActionConfigurator
            data={node.data as ActionNodeData}
            onChange={(data) => onUpdate({ ...node, data })}
          />
        );
      case 'delay':
        return <DelayConfig data={node.data as DelayNodeData} onChange={(data) => onUpdate({ ...node, data })} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-72 border-l bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(node.type.charAt(0).toUpperCase() + node.type.slice(1))}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Label input */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Label')}</Label>
          <Input
            className="h-8 text-xs"
            value={node.label}
            onChange={(e) => handleLabelChange(e.target.value)}
          />
        </div>

        {/* Type-specific configurator */}
        {renderConfigurator()}
      </div>
    </div>
  );
}

// ---- Delay config (inline) ----

function DelayConfig({
  data,
  onChange,
}: {
  data: DelayNodeData;
  onChange: (data: DelayNodeData) => void;
}) {
  const { t } = useTranslation('returns');

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Wait Duration')}</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            className="h-8 text-xs w-20"
            value={data.amount}
            onChange={(e) => onChange({ ...data, amount: Math.max(1, Number(e.target.value)) })}
          />
          <Select
            value={data.unit}
            onValueChange={(v) => onChange({ ...data, unit: v as DelayUnit })}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">{t('Minutes')}</SelectItem>
              <SelectItem value="hours">{t('Hours')}</SelectItem>
              <SelectItem value="days">{t('Days')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
