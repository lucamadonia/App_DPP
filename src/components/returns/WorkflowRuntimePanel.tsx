import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getWorkflowRuns, runWorkflowManually, type WorkflowRun } from '@/services/supabase/workflow-runs';
import { getReturns } from '@/services/supabase/returns';
import { getRhTickets } from '@/services/supabase/rh-tickets';
import { getRhCustomers } from '@/services/supabase/rh-customers';
import type { RhWorkflowRule } from '@/types/returns-hub';

export function WorkflowRuntimePanel({ rules }: { rules: RhWorkflowRule[] }) {
  const { t, i18n } = useTranslation('returns');
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ruleId, setRuleId] = useState('');
  const [type, setType] = useState<'none' | 'return' | 'ticket' | 'customer'>('none');
  const [entityId, setEntityId] = useState('');
  const [search, setSearch] = useState('');
  const [entities, setEntities] = useState<{ id: string; label: string }[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const refresh = useCallback(async () => {
    try { setRuns(await getWorkflowRuns()); setError(false); }
    catch { setError(true); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => { void refresh(); }, 15000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => {
    if (type === 'none') return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingEntities(true);
      try {
        let items: { id: string; label: string }[];
        if (type === 'return') items = (await getReturns({ search }, 1, 50)).data.map(r => ({ id: r.id, label: r.returnNumber }));
        else if (type === 'ticket') items = (await getRhTickets({ search }, 1, 50)).data.map(ticket => ({ id: ticket.id, label: `${ticket.ticketNumber} · ${ticket.subject}` }));
        else items = (await getRhCustomers(search, 1, 50)).data.map(c => ({ id: c.id, label: `${c.firstName || ''} ${c.lastName || ''} · ${c.email}` }));
        if (active) setEntities(items);
      } catch { if (active) toast.error(t('Action failed')); }
      finally { if (active) setLoadingEntities(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [type, search, t]);
  const manual = rules.filter(rule => rule.triggerType === 'manual' && rule.active && rule.serverExecution);
  const selectClass = 'h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm';
  return <Card className="min-w-0">
    <CardHeader><CardTitle>{t('Workflow execution')}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('Server workflows continue when the app is closed. Enable server execution for each rule after reviewing its actions.')}</p>
      {manual.length > 0 && <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1"><Label htmlFor="manual-workflow">{t('Manual Trigger')}</Label><select id="manual-workflow" className={selectClass} value={ruleId} onChange={event => setRuleId(event.target.value)}>
          <option value="">{t('Select workflow')}</option>{manual.map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
        </select></div>
        <div className="space-y-1"><Label htmlFor="workflow-entity-type">{t('Apply to')}</Label><select id="workflow-entity-type" className={selectClass} value={type} onChange={event => { setType(event.target.value as typeof type); setEntityId(''); setEntities([]); setSearch(''); }}>
          <option value="none">{t('Without linked record')}</option><option value="return">{t('Return')}</option><option value="ticket">{t('Ticket')}</option><option value="customer">{t('Customer')}</option>
        </select></div>
        {type !== 'none' && <><Input aria-label={t('Search records')} placeholder={t('Search records')} value={search} onChange={event => { setSearch(event.target.value); setEntityId(''); }} /><select aria-label={t('Select record')} className={selectClass} value={entityId} disabled={loadingEntities} onChange={event => setEntityId(event.target.value)}><option value="">{t('Select record')}</option>{entities.map(entity => <option key={entity.id} value={entity.id}>{entity.label}</option>)}</select></>}
        <Button disabled={busy || !ruleId || (type !== 'none' && !entityId)} onClick={async () => {
          setBusy(true);
          try { await runWorkflowManually(ruleId, type === 'none' ? undefined : { type, id: entityId }); toast.success(t('Workflow queued')); await refresh(); }
          catch (err) { toast.error(err instanceof Error ? err.message : t('Action failed')); }
          finally { setBusy(false); }
        }}>{t('Run now')}</Button>
      </div>}
      <div className="flex items-center justify-between gap-2"><h3 className="font-medium">{t('Recent runs')}</h3><Button variant="outline" size="sm" onClick={() => void refresh()}>{t('Refresh', { ns: 'common' })}</Button></div>
      {error && <p role="alert" className="text-sm text-destructive">{t('Workflow history could not be loaded.')}</p>}
      {!error && !runs.length && <p className="text-sm text-muted-foreground">{t('No workflow runs yet.')}</p>}
      {runs.map(run => <div key={run.id} className="min-w-0 rounded-md border p-3 text-sm">
        <p className="break-words font-medium">{rules.find(rule => rule.id === run.rule_id)?.name || t('Workflow')}</p>
        <p>{t(`Execution ${run.status}`)} · {new Date(run.created_at).toLocaleString(i18n.language)}</p>
        {run.status === 'waiting' && <p>{t('Resume at')}: {new Date(run.available_at).toLocaleString(i18n.language)}</p>}
        {run.error && <p className="break-words text-destructive">{run.error}</p>}
      </div>)}
    </CardContent>
  </Card>;
}
