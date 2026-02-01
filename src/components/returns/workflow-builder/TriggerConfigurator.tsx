import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldPicker, resolveField } from './FieldPicker';
import type { TriggerNodeData, TriggerEventType, TriggerFilter, ConditionOperator } from '@/types/workflow-builder';

interface TriggerConfiguratorProps {
  data: TriggerNodeData;
  onChange: (data: TriggerNodeData) => void;
}

const TRIGGER_GROUPS = [
  {
    label: 'Return Events',
    items: [
      { value: 'return_created', label: 'Return Created' },
      { value: 'return_status_changed', label: 'Status Changed' },
      { value: 'return_overdue', label: 'Return Overdue' },
    ],
  },
  {
    label: 'Ticket Events',
    items: [
      { value: 'ticket_created', label: 'Ticket Created' },
      { value: 'ticket_status_changed', label: 'Ticket Status Changed' },
      { value: 'ticket_overdue', label: 'Ticket Overdue' },
    ],
  },
  {
    label: 'Customer Events',
    items: [
      { value: 'customer_risk_changed', label: 'Risk Score Changed' },
      { value: 'customer_tag_added', label: 'Customer Tag Added' },
    ],
  },
  {
    label: 'Schedule',
    items: [
      { value: 'scheduled_daily', label: 'Daily Schedule' },
      { value: 'scheduled_weekly', label: 'Weekly Schedule' },
      { value: 'scheduled_monthly', label: 'Monthly Schedule' },
    ],
  },
  {
    label: 'Other',
    items: [{ value: 'manual', label: 'Manual Trigger' }],
  },
];

const FILTER_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'in', label: 'In List' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const isScheduled = (et: TriggerEventType) =>
  et === 'scheduled_daily' || et === 'scheduled_weekly' || et === 'scheduled_monthly';

export function TriggerConfigurator({ data, onChange }: TriggerConfiguratorProps) {
  const { t } = useTranslation('returns');
  const filters = data.filters || [];

  const handleAddFilter = () => {
    const newFilter: TriggerFilter = { field: '', operator: 'equals', value: '' };
    onChange({ ...data, filters: [...filters, newFilter] });
  };

  const handleUpdateFilter = (index: number, updated: TriggerFilter) => {
    const next = filters.map((f, i) => (i === index ? updated : f));
    onChange({ ...data, filters: next });
  };

  const handleRemoveFilter = (index: number) => {
    onChange({ ...data, filters: filters.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Event Type')}</Label>
        <Select
          value={data.eventType}
          onValueChange={(v) => onChange({ ...data, eventType: v as TriggerEventType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{t(group.label)}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Schedule config */}
      {isScheduled(data.eventType) && (
        <div className="space-y-2 p-2 bg-muted rounded-md">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Time')}</Label>
            <Input
              type="time"
              value={data.schedule?.time || '09:00'}
              onChange={(e) =>
                onChange({
                  ...data,
                  schedule: { ...data.schedule, time: e.target.value },
                })
              }
            />
          </div>
          {data.eventType === 'scheduled_weekly' && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Day of Week')}</Label>
              <Select
                value={String(data.schedule?.dayOfWeek ?? 1)}
                onValueChange={(v) =>
                  onChange({
                    ...data,
                    schedule: { ...data.schedule, dayOfWeek: Number(v) },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                    (day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {t(day)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {data.eventType === 'scheduled_monthly' && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Day of Month')}</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={data.schedule?.dayOfMonth ?? 1}
                onChange={(e) =>
                  onChange({
                    ...data,
                    schedule: { ...data.schedule, dayOfMonth: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Trigger Filters */}
      <div className="space-y-2">
        <Label className="text-xs">{t('Trigger Filters')}</Label>
        {filters.length === 0 && (
          <p className="text-[10px] text-muted-foreground">{t('No filters — triggers for all events')}</p>
        )}
        {filters.map((filter, index) => {
          const resolved = filter.field ? resolveField(filter.field) : undefined;
          const hasEnum = resolved?.enumValues && resolved.enumValues.length > 0;
          const noValueNeeded = filter.operator === 'is_empty' || filter.operator === 'is_not_empty';
          return (
            <div key={index} className="space-y-1.5 p-2 bg-muted rounded-md">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium flex-1">
                  {t('Filter')} {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive"
                  onClick={() => handleRemoveFilter(index)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
              <FieldPicker
                value={filter.field}
                onChange={(field) => handleUpdateFilter(index, { ...filter, field })}
              />
              <Select
                value={filter.operator}
                onValueChange={(v) => handleUpdateFilter(index, { ...filter, operator: v as ConditionOperator })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {t(op.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!noValueNeeded && (
                hasEnum ? (
                  <Select
                    value={String(filter.value ?? '')}
                    onValueChange={(v) => handleUpdateFilter(index, { ...filter, value: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={t('Select Value')} />
                    </SelectTrigger>
                    <SelectContent>
                      {resolved!.enumValues!.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-7 text-xs"
                    placeholder={t('Value')}
                    value={String(filter.value ?? '')}
                    onChange={(e) => handleUpdateFilter(index, { ...filter, value: e.target.value })}
                  />
                )
              )}
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full gap-1"
          onClick={handleAddFilter}
        >
          <Plus size={12} /> {t('Add Filter')}
        </Button>
      </div>
    </div>
  );
}
