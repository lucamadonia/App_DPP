import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailActionConfig } from './EmailActionConfig';
import { FieldPicker } from './FieldPicker';
import type { ActionNodeData, WorkflowActionType } from '@/types/workflow-builder';

interface ActionConfiguratorProps {
  data: ActionNodeData;
  onChange: (data: ActionNodeData) => void;
}

const ACTION_GROUPS = [
  {
    label: 'Return Actions',
    items: [
      { value: 'set_status', label: 'Set Status' },
      { value: 'set_priority', label: 'Set Priority' },
      { value: 'assign', label: 'Assign' },
      { value: 'approve', label: 'Approve' },
      { value: 'reject', label: 'Reject' },
      { value: 'add_note', label: 'Add Note' },
      { value: 'update_field', label: 'Update Field' },
    ],
  },
  {
    label: 'Ticket Actions',
    items: [
      { value: 'ticket_create', label: 'Create Ticket' },
      { value: 'ticket_set_status', label: 'Ticket Status' },
      { value: 'ticket_set_priority', label: 'Ticket Priority' },
      { value: 'ticket_assign', label: 'Ticket Assign' },
      { value: 'ticket_add_message', label: 'Ticket Message' },
      { value: 'ticket_add_tag', label: 'Ticket Tag' },
    ],
  },
  {
    label: 'Customer Actions',
    items: [
      { value: 'customer_update_risk_score', label: 'Update Risk Score' },
      { value: 'customer_add_tag', label: 'Customer Tag' },
      { value: 'customer_update_notes', label: 'Update Notes' },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { value: 'email_send_template', label: 'Send Email Template' },
      { value: 'email_send_custom', label: 'Send Custom Email' },
      { value: 'notification_internal', label: 'Internal Notification' },
    ],
  },
  {
    label: 'Utility',
    items: [
      { value: 'timeline_add_entry', label: 'Timeline Entry' },
      { value: 'webhook_call', label: 'Webhook' },
    ],
  },
];

const STATUS_OPTIONS = [
  'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED',
  'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING',
  'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
];

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

function ActionParams({
  actionType,
  params,
  onChange,
}: {
  actionType: WorkflowActionType;
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation('returns');

  switch (actionType) {
    case 'set_status':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('New Status')}</Label>
          <Select
            value={String(params.status ?? '')}
            onValueChange={(v) => onChange({ ...params, status: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('Select Status')} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'set_priority':
    case 'ticket_set_priority':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Priority')}</Label>
          <Select
            value={String(params.priority ?? '')}
            onValueChange={(v) => onChange({ ...params, priority: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('Select Priority')} />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(p.charAt(0).toUpperCase() + p.slice(1))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'assign':
    case 'ticket_assign':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Assign To')}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={t('User ID or email')}
            value={String(params.assignTo ?? '')}
            onChange={(e) => onChange({ ...params, assignTo: e.target.value })}
          />
        </div>
      );

    case 'add_note':
    case 'ticket_add_message':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Message')}</Label>
          <Textarea
            className="text-xs min-h-[60px]"
            placeholder={t('Enter message...')}
            value={String(params.message ?? '')}
            onChange={(e) => onChange({ ...params, message: e.target.value })}
          />
        </div>
      );

    case 'ticket_set_status':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Ticket Status')}</Label>
          <Select
            value={String(params.status ?? '')}
            onValueChange={(v) => onChange({ ...params, status: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('Select Status')} />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'ticket_create':
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Subject')}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={t('Ticket subject...')}
              value={String(params.subject ?? '')}
              onChange={(e) => onChange({ ...params, subject: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Category')}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={t('Category')}
              value={String(params.category ?? '')}
              onChange={(e) => onChange({ ...params, category: e.target.value })}
            />
          </div>
        </div>
      );

    case 'ticket_add_tag':
    case 'customer_add_tag':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Tag')}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={t('Tag name')}
            value={String(params.tag ?? '')}
            onChange={(e) => onChange({ ...params, tag: e.target.value })}
          />
        </div>
      );

    case 'customer_update_risk_score':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Risk Score')}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            max={100}
            value={String(params.riskScore ?? '')}
            onChange={(e) => onChange({ ...params, riskScore: Number(e.target.value) })}
          />
        </div>
      );

    case 'customer_update_notes':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Notes')}</Label>
          <Textarea
            className="text-xs min-h-[60px]"
            value={String(params.notes ?? '')}
            onChange={(e) => onChange({ ...params, notes: e.target.value })}
          />
        </div>
      );

    case 'email_send_template':
      return <EmailActionConfig params={params} onChange={onChange} />;

    case 'email_send_custom':
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Recipient Email')}</Label>
            <Input
              className="h-8 text-xs"
              placeholder="{{customer.email}}"
              value={String(params.recipientEmail ?? '')}
              onChange={(e) => onChange({ ...params, recipientEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Subject')}</Label>
            <Input
              className="h-8 text-xs"
              value={String(params.subject ?? '')}
              onChange={(e) => onChange({ ...params, subject: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Body')}</Label>
            <Textarea
              className="text-xs min-h-[80px]"
              value={String(params.body ?? '')}
              onChange={(e) => onChange({ ...params, body: e.target.value })}
            />
          </div>
        </div>
      );

    case 'notification_internal':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Message')}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={t('Notification message')}
            value={String(params.message ?? '')}
            onChange={(e) => onChange({ ...params, message: e.target.value })}
          />
        </div>
      );

    case 'approve':
    case 'reject':
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Reason')}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={t('Optional reason')}
              value={String(params.reason ?? '')}
              onChange={(e) => onChange({ ...params, reason: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Customer Message')}</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder={t('Message to customer (supports {{variables}})')}
              value={String(params.customerMessage ?? '')}
              onChange={(e) => onChange({ ...params, customerMessage: e.target.value })}
            />
          </div>
        </div>
      );

    case 'update_field':
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Field')}</Label>
            <FieldPicker
              value={String(params.field ?? '')}
              onChange={(field) => onChange({ ...params, field })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('New Value')}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={t('Value (supports {{variables}})')}
              value={String(params.value ?? '')}
              onChange={(e) => onChange({ ...params, value: e.target.value })}
            />
          </div>
        </div>
      );

    case 'webhook_call':
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input
              className="h-8 text-xs"
              placeholder="https://..."
              value={String(params.url ?? '')}
              onChange={(e) => onChange({ ...params, url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Method')}</Label>
            <Select
              value={String(params.method ?? 'POST')}
              onValueChange={(v) => onChange({ ...params, method: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Headers')}</Label>
            <Textarea
              className="text-xs min-h-[60px] font-mono"
              placeholder={"Content-Type: application/json\nAuthorization: Bearer {{token}}"}
              value={String(params.headers ?? '')}
              onChange={(e) => onChange({ ...params, headers: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">{t('One header per line (Key: Value)')}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Body Payload')}</Label>
            <Textarea
              className="text-xs min-h-[80px] font-mono"
              placeholder={'{\n  "returnId": "{{returnNumber}}",\n  "status": "{{status}}"\n}'}
              value={String(params.body ?? '')}
              onChange={(e) => onChange({ ...params, body: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">{t('Use {{variable}} syntax for dynamic values')}</p>
          </div>
        </div>
      );

    case 'timeline_add_entry':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Comment')}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={t('Timeline comment')}
            value={String(params.comment ?? '')}
            onChange={(e) => onChange({ ...params, comment: e.target.value })}
          />
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <Info size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{t('No additional configuration required')}</span>
        </div>
      );
  }
}

export function ActionConfigurator({ data, onChange }: ActionConfiguratorProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Action Type')}</Label>
        <Select
          value={data.actionType}
          onValueChange={(v) =>
            onChange({ ...data, actionType: v as WorkflowActionType, params: {} })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_GROUPS.map((group) => (
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

      <ActionParams
        actionType={data.actionType}
        params={data.params}
        onChange={(params) => onChange({ ...data, params })}
      />
    </div>
  );
}
