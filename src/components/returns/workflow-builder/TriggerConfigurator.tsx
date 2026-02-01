import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TriggerNodeData, TriggerEventType } from '@/types/workflow-builder';

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

const isScheduled = (et: TriggerEventType) =>
  et === 'scheduled_daily' || et === 'scheduled_weekly' || et === 'scheduled_monthly';

export function TriggerConfigurator({ data, onChange }: TriggerConfiguratorProps) {
  const { t } = useTranslation('returns');

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
    </div>
  );
}
