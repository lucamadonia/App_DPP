import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldPicker, resolveField } from './FieldPicker';
import type { ConditionNodeData, FieldCondition, ConditionOperator, ConditionLogicOperator } from '@/types/workflow-builder';
import { generateNodeId } from './workflowUtils';

interface ConditionBuilderProps {
  data: ConditionNodeData;
  onChange: (data: ConditionNodeData) => void;
}

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_or_equal', label: 'Greater or Equal' },
  { value: 'less_or_equal', label: 'Less or Equal' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'matches_regex', label: 'Matches Regex' },
];

const UNARY_OPERATORS: ConditionOperator[] = ['is_empty', 'is_not_empty'];

export function ConditionBuilder({ data, onChange }: ConditionBuilderProps) {
  const { t } = useTranslation('returns');

  const addCondition = () => {
    const newCondition: FieldCondition = {
      id: generateNodeId(),
      field: '',
      operator: 'equals',
      value: '',
    };
    onChange({ ...data, conditions: [...data.conditions, newCondition] });
  };

  const removeCondition = (id: string) => {
    onChange({ ...data, conditions: data.conditions.filter((c) => c.id !== id) });
  };

  const updateCondition = (id: string, updates: Partial<FieldCondition>) => {
    onChange({
      ...data,
      conditions: data.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  };

  const toggleLogic = () => {
    const next: ConditionLogicOperator = data.logicOperator === 'AND' ? 'OR' : 'AND';
    onChange({ ...data, logicOperator: next });
  };

  return (
    <div className="space-y-3">
      {/* AND / OR toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">{t('Match')}</Label>
        <Button variant="outline" size="sm" onClick={toggleLogic} className="h-6 text-xs px-2">
          {data.logicOperator}
        </Button>
        <span className="text-xs text-muted-foreground">
          {data.logicOperator === 'AND' ? t('all conditions') : t('any condition')}
        </span>
      </div>

      {/* Condition rows */}
      {data.conditions.map((cond) => {
        const fieldMeta = resolveField(cond.field);
        const isUnary = UNARY_OPERATORS.includes(cond.operator);
        const isEnum = fieldMeta?.dataType === 'enum' && fieldMeta.enumValues;

        return (
          <div key={cond.id} className="flex items-start gap-1.5 p-2 bg-muted rounded-md">
            <div className="flex-1 space-y-1.5">
              <FieldPicker
                value={cond.field}
                onChange={(field) => updateCondition(cond.id, { field })}
              />
              <Select
                value={cond.operator}
                onValueChange={(v) =>
                  updateCondition(cond.id, { operator: v as ConditionOperator })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {t(op.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isUnary && (
                isEnum ? (
                  <Select
                    value={String(cond.value ?? '')}
                    onValueChange={(v) => updateCondition(cond.id, { value: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('Select Value')} />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldMeta.enumValues!.map((ev) => (
                        <SelectItem key={ev} value={ev}>
                          {t(ev.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 text-xs"
                    placeholder={t('Value')}
                    value={String(cond.value ?? '')}
                    onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  />
                )
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive shrink-0 mt-1"
              onClick={() => removeCondition(cond.id)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addCondition} className="w-full text-xs">
        <Plus size={12} className="mr-1" /> {t('Add Condition')}
      </Button>
    </div>
  );
}
