import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Zap, Workflow, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { WorkflowRuleEditor } from '@/components/returns/WorkflowRuleEditor';
import { EmptyState } from '@/components/returns/EmptyState';
import { ErrorState } from '@/components/ui/state-feedback';
import { pageVariants, pageTransition, staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
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
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<RhWorkflowRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await getRhWorkflowRules();
      setRules(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
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

  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: pageVariants, initial: 'initial', animate: 'animate', transition: pageTransition };

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    <Wrapper className="space-y-6" {...wrapperProps as any}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Workflow Rules')}</h1>
          <p className="text-muted-foreground">{t('Automate return processing')}</p>
        </div>
        {!creating && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreating(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" /> {t('New Rule')}
            </Button>
            <Button onClick={handleNewVisualWorkflow} disabled={saving} className="flex-1 sm:flex-none">
              <Workflow className="h-4 w-4 mr-2" /> {t('Visual Builder')}
            </Button>
          </div>
        )}
      </div>

      {creating && (
        <WorkflowRuleEditor onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} />
      )}

      {editing && (
        <WorkflowRuleEditor rule={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} saving={saving} />
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
        ) : prefersReduced ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Switch checked={rule.active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                      <div className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rule.name}</p>
                        {isGraphBased(rule) && <Badge variant="outline" className="text-[10px] h-4 border-violet-300 text-violet-600">v2</Badge>}
                      </div>
                      {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{t(rule.triggerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</Badge>
                        <Badge variant="secondary" className="text-xs">{rule.actions.length} {t('Actions')}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-10 sm:ml-0">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/returns/workflows/${rule.id}/builder`)}><Workflow className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Visual Builder')}</span></Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(rule)}><Pencil className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Edit')}</span></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(rule.id)}><Trash2 className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Delete')}</span></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
            {rules.map((rule) => (
              <motion.div key={rule.id} variants={staggerItem}>
                <Card>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Switch checked={rule.active} onCheckedChange={(v) => handleToggle(rule.id, v)} />
                        <div className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{rule.name}</p>
                          {isGraphBased(rule) && <Badge variant="outline" className="text-[10px] h-4 border-violet-300 text-violet-600">v2</Badge>}
                        </div>
                        {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{t(rule.triggerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</Badge>
                          <Badge variant="secondary" className="text-xs">{rule.actions.length} {t('Actions')}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-10 sm:ml-0">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/returns/workflows/${rule.id}/builder`)}><Workflow className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Visual Builder')}</span></Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(rule)}><Pencil className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Edit')}</span></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(rule.id)}><Trash2 className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('Delete')}</span></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </Wrapper>
  );
}
