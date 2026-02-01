import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { WorkflowRuleEditor } from '@/components/returns/WorkflowRuleEditor';
import { EmptyState } from '@/components/returns/EmptyState';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { getRhWorkflowRules, createRhWorkflowRule, updateRhWorkflowRule, deleteRhWorkflowRule } from '@/services/supabase';
import type { RhWorkflowRule } from '@/types/returns-hub';

function isGraphBased(rule: RhWorkflowRule): boolean {
  return (rule.conditions as { _graphVersion?: number })?._graphVersion === 2;
}

export function WorkflowRulesPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [rules, setRules] = useState<RhWorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RhWorkflowRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getRhWorkflowRules();
    setRules(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (rule: Omit<RhWorkflowRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    setSaving(true);
    await createRhWorkflowRule(rule);
    setCreating(false);
    setSaving(false);
    await load();
  };

  const handleUpdate = async (rule: Omit<RhWorkflowRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    setSaving(true);
    await updateRhWorkflowRule(editing.id, rule);
    setEditing(null);
    setSaving(false);
    await load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await updateRhWorkflowRule(id, { active });
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteRhWorkflowRule(id);
    await load();
  };

  const handleNewVisualWorkflow = async () => {
    setSaving(true);
    const result = await createRhWorkflowRule({
      name: t('New Workflow'),
      triggerType: 'return_created',
      conditions: {},
      actions: [],
      active: false,
      sortOrder: rules.length,
    });
    setSaving(false);
    if (result.success && result.id) {
      navigate(`/returns/workflows/${result.id}/builder`);
    }
  };

  const ruleVisibility = useStaggeredList(rules.length, { interval: 50, initialDelay: 100 });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            <div className="h-4 bg-muted rounded w-56 animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4 animate-pulse">
                <div className="h-5 w-9 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Workflow Rules')}</h1>
          <p className="text-muted-foreground">{t('Automate return processing')}</p>
        </div>
        {!creating && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t('New Rule')}
            </Button>
            <Button onClick={handleNewVisualWorkflow} disabled={saving}>
              <Workflow className="h-4 w-4 mr-2" /> {t('Visual Builder')}
            </Button>
          </div>
        )}
      </div>

      {creating && (
        <div className="animate-fade-in-up">
          <WorkflowRuleEditor
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      {editing && (
        <div className="animate-fade-in-up">
          <WorkflowRuleEditor
            rule={editing}
            onSave={handleUpdate}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        </div>
      )}

      {!creating && !editing && (
        rules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={t('No workflow rules defined')}
            description={t('Create rules to automate return processing')}
            actionLabel={t('Visual Builder')}
            onAction={handleNewVisualWorkflow}
          />
        ) : (
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <Card
                key={rule.id}
                className={`transition-all duration-300 ${
                  ruleVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Switch checked={rule.active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                      <div className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rule.name}</p>
                        {isGraphBased(rule) && (
                          <Badge variant="outline" className="text-[10px] h-4 border-violet-300 text-violet-600">
                            v2
                          </Badge>
                        )}
                      </div>
                      {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{t(rule.triggerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</Badge>
                        <Badge variant="secondary" className="text-xs">{rule.actions.length} {t('Actions')}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/returns/workflows/${rule.id}/builder`)}
                    >
                      <Workflow className="h-3.5 w-3.5 mr-1" />
                      {t('Visual Builder')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(rule)}>{t('Edit')}</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(rule.id)}>{t('Delete')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
