import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RhWorkflowRule, RhWorkflowAction } from '@/types/returns-hub';
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, TriggerEventType, WorkflowActionType } from '@/types/workflow-builder';

interface WorkflowRuleEditorProps {
  rule?: RhWorkflowRule;
  onSave: (rule: Omit<RhWorkflowRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  saving?: boolean;
}

const triggerTypes: { value: TriggerEventType; label: string }[] = [
  { value: 'return_created', label: 'On Return Created' },
  { value: 'return_status_changed', label: 'On Status Changed' },
  { value: 'ticket_created', label: 'On Ticket Created' },
  { value: 'ticket_status_changed', label: 'On Ticket Status Changed' },
  { value: 'customer_risk_changed', label: 'On Customer Risk Changed' },
  { value: 'customer_tag_added', label: 'On Customer Tag Added' },
];

const actionTypes: { value: WorkflowActionType; label: string }[] = [
  { value: 'set_status', label: 'Set Status' },
  { value: 'set_priority', label: 'Set Priority' },
  { value: 'assign', label: 'Assign To' },
  { value: 'approve', label: 'Auto-Approve' },
  { value: 'reject', label: 'Auto-Reject' },
  { value: 'add_note', label: 'Add Note' },
  { value: 'ticket_create', label: 'Create Ticket' },
  { value: 'email_send_template', label: 'Send Email Template' },
  { value: 'customer_add_tag', label: 'Add Customer Tag' },
  { value: 'customer_update_risk_score', label: 'Update Risk Score' },
];

/**
 * Converts simple trigger + actions list into a valid WorkflowGraph
 * so the workflow engine can execute rules created via this editor.
 */
function buildSimpleGraph(triggerType: TriggerEventType, actions: RhWorkflowAction[]): WorkflowGraph {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const triggerId = 'trigger-1';
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { eventType: triggerType },
    label: 'Trigger',
  });

  let prevId = triggerId;
  actions.forEach((action, i) => {
    const actionId = `action-${i + 1}`;
    nodes.push({
      id: actionId,
      type: 'action',
      position: { x: 250, y: 150 + i * 100 },
      data: { actionType: action.type as WorkflowActionType, params: action.params || {} },
      label: action.type,
    });
    edges.push({
      id: `edge-${prevId}-${actionId}`,
      source: prevId,
      target: actionId,
    });
    prevId = actionId;
  });

  return {
    _graphVersion: 2,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function WorkflowRuleEditor({ rule, onSave, onCancel, saving }: WorkflowRuleEditorProps) {
  const { t } = useTranslation('returns');
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [triggerType, setTriggerType] = useState(rule?.triggerType || 'return_created');
  const [active, setActive] = useState(rule?.active ?? true);
  const [actions, setActions] = useState<RhWorkflowAction[]>(rule?.actions || []);

  const handleAddAction = () => {
    setActions([...actions, { type: 'set_status', params: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: string) => {
    const updated = [...actions];
    updated[index] = { type: type as RhWorkflowAction['type'], params: {} };
    setActions(updated);
  };

  const handleSave = () => {
    // Build a proper WorkflowGraph so the engine can execute this rule
    const graph = buildSimpleGraph(triggerType as TriggerEventType, actions);
    onSave({
      name,
      description: description || undefined,
      triggerType,
      conditions: graph as unknown as Record<string, unknown>,
      actions,
      active,
      sortOrder: rule?.sortOrder || 0,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{rule ? t('Edit Rule') : t('New Rule')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('Rule Name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Rule Name')} />
          </div>
          <div className="space-y-2">
            <Label>{t('Trigger')}</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerTypes.map((trigger) => (
                  <SelectItem key={trigger.value} value={trigger.value}>
                    {t(trigger.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('Description')}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('Actions')}</Label>
            <Button variant="outline" size="sm" onClick={handleAddAction}>
              + {t('Add Action')}
            </Button>
          </div>
          {actions.map((action, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded border">
              <Select value={action.type} onValueChange={(v) => handleActionTypeChange(index, v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((at) => (
                    <SelectItem key={at.value} value={at.value}>
                      {t(at.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveAction(index)} className="text-destructive">
                {t('Delete')}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Switch id="rule-active" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="rule-active">{t('Active')}</Label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>{t('Cancel')}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {t('Save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
