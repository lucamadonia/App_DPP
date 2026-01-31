import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { WorkflowRuleEditor } from '@/components/returns/WorkflowRuleEditor';
import { getRhWorkflowRules, createRhWorkflowRule, updateRhWorkflowRule, deleteRhWorkflowRule } from '@/services/supabase';
import type { RhWorkflowRule } from '@/types/returns-hub';

export function WorkflowRulesPage() {
  const { t } = useTranslation('returns');
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Workflow Rules')}</h1>
          <p className="text-muted-foreground">{t('Automate return processing')}</p>
        </div>
        {!creating && !editing && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t('New Rule')}
          </Button>
        )}
      </div>

      {creating && (
        <WorkflowRuleEditor
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
          saving={saving}
        />
      )}

      {editing && (
        <WorkflowRuleEditor
          rule={editing}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {!creating && !editing && (
        rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">{t('No workflow rules defined')}</p>
              <Button variant="outline" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-2" /> {t('New Rule')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Switch checked={rule.active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{rule.triggerType.replace(/_/g, ' ')}</Badge>
                        <Badge variant="secondary" className="text-xs">{rule.actions.length} {t('Actions')}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
