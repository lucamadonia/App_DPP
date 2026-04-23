/**
 * Admin Tenants List — redesigned for v2:
 *  - Health-Gauge column
 *  - Status column (active/suspended/trial_expired)
 *  - Multi-select with bulk toolbar (suspend, credits, tag, export)
 *  - Advanced filters (plan, status, health bucket)
 *  - Quick-actions per row (Impersonate / Open)
 *  - CSV export of visible or selected rows
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, Search, RefreshCw, Ban, Download, UserPlus, Eye, ExternalLink,
  CircleDot,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { TenantHealthGauge } from '@/components/admin/TenantHealthGauge';
import { ConfirmWithReasonDialog } from '@/components/admin/ConfirmWithReasonDialog';
import {
  listAdminTenants, suspendTenant, reactivateTenant, startImpersonation,
} from '@/services/supabase/admin';
import { saveImpersonation } from '@/services/supabase/admin-impersonation';
import { supabase } from '@/lib/supabase';
import type { AdminTenant } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { toast } from 'sonner';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enterprise: 'bg-violet-50 text-violet-700 border-violet-200',
};

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  trial_expired: 'bg-amber-50 text-amber-700 border-amber-200',
  deleted: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface TenantRow extends AdminTenant {
  healthScore?: number;
  status: string;
  suspendedReason?: string;
  suspendedAt?: string;
}

export function AdminTenantsPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [reactivateTargetId, setReactivateTargetId] = useState<string | null>(null);
  const [impersonateTargetId, setImpersonateTargetId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const tenantList = await listAdminTenants();
      const ids = tenantList.map(x => x.id);
      const { data: rows } = ids.length
        ? await supabase.from('tenants').select('id, health_score, status, suspended_reason, suspended_at').in('id', ids)
        : { data: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map((rows || []).map((r: any) => [r.id, r]));
      setTenants(tenantList.map(x => ({
        ...x,
        healthScore: map.get(x.id)?.health_score ?? undefined,
        status: map.get(x.id)?.status || 'active',
        suspendedReason: map.get(x.id)?.suspended_reason ?? undefined,
        suspendedAt: map.get(x.id)?.suspended_at ?? undefined,
      })));
    } catch (err) {
      console.error('Failed to load tenants:', err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || t.plan === planFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const h = t.healthScore ?? 100;
      const matchHealth =
        healthFilter === 'all' ||
        (healthFilter === 'crit' && h < 30) ||
        (healthFilter === 'low' && h < 60 && h >= 30) ||
        (healthFilter === 'ok' && h >= 60 && h < 80) ||
        (healthFilter === 'top' && h >= 80);
      return matchSearch && matchPlan && matchStatus && matchHealth;
    });
  }, [tenants, search, planFilter, statusFilter, healthFilter]);

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(t => t.id));
    });
  }

  async function handleSuspend(reason: string) {
    if (!suspendTargetId) return;
    await suspendTenant(suspendTargetId, reason);
    toast.success(t('Tenant gesperrt'));
    setSuspendTargetId(null);
    await load(true);
  }

  async function handleReactivate(reason: string) {
    if (!reactivateTargetId) return;
    await reactivateTenant(reactivateTargetId, reason || undefined);
    toast.success(t('Tenant reaktiviert'));
    setReactivateTargetId(null);
    await load(true);
  }

  async function handleImpersonate(reason: string) {
    if (!impersonateTargetId) return;
    try {
      const session = await startImpersonation(impersonateTargetId, reason);
      saveImpersonation(session);
      toast.success(t('Impersonation gestartet: {{name}}', { name: session.tenantName }));
      setImpersonateTargetId(null);
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function handleExportCSV() {
    const rows = selected.size > 0 ? filtered.filter(t => selected.has(t.id)) : filtered;
    const headers = ['ID', 'Name', 'Slug', 'Plan', 'Status', 'Health', 'Users', 'Products', 'Active Modules', 'Created'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => [
        r.id, r.name, r.slug, r.plan, r.status, r.healthScore ?? '',
        r.userCount, r.productCount, (r.activeModules || []).join('|'),
        r.createdAt,
      ].map(v => {
        const s = String(v ?? '');
        return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';')),
    ].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('{{n}} Tenants als CSV exportiert', { n: rows.length }));
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{t('Tenants')}</h1>
            <p className="text-xs text-muted-foreground">
              {tenants.length} {t('total')} · {tenants.filter(t => t.status === 'active').length} {t('aktiv')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            {t('CSV Export')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Neu laden')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Suche Name oder Slug')}
                className="pl-8 h-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Alle Pläne')}</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Alle Status')}</SelectItem>
                <SelectItem value="active">{t('Aktiv')}</SelectItem>
                <SelectItem value="suspended">{t('Gesperrt')}</SelectItem>
                <SelectItem value="trial_expired">{t('Trial abgelaufen')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Health" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Alle Health')}</SelectItem>
                <SelectItem value="top">{t('Top (80+)')}</SelectItem>
                <SelectItem value="ok">{t('OK (60-79)')}</SelectItem>
                <SelectItem value="low">{t('Schwach (30-59)')}</SelectItem>
                <SelectItem value="crit">{t('Kritisch (<30)')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <Badge variant="secondary" className="tabular-nums">{selected.size}</Badge>
          <span className="text-sm font-medium">{t('ausgewählt')}</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            {t('Export Auswahl')}
          </Button>
          <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800" onClick={() => setSelected(new Set())}>
            {t('Aufheben')}
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                    aria-label={t('Alle auswählen')}
                  />
                </TableHead>
                <TableHead>{t('Tenant')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Plan')}</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-center">Health</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Users</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Produkte</TableHead>
                <TableHead className="hidden xl:table-cell">{t('Module')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Angelegt')}</TableHead>
                <TableHead className="text-right">{t('Aktionen')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={10}><ShimmerSkeleton className="h-10" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    {t('Keine Tenants gefunden')}
                  </TableCell>
                </TableRow>
              ) : filtered.map((tn) => (
                <TableRow key={tn.id} className={selected.has(tn.id) ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(tn.id)}
                      onCheckedChange={() => toggleOne(tn.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <Link to={`/admin/tenants/${tn.id}`} className="block group">
                      <div className="font-medium group-hover:text-primary transition-colors">{tn.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{tn.slug}</div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={`${PLAN_COLORS[tn.plan] || ''} text-[10px] h-5 px-2`}>
                      {tn.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={`${STATUS_TONE[tn.status] || ''} text-[10px] h-5 px-2 gap-1`}>
                      <CircleDot className="h-2 w-2" />
                      {tn.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex">
                      <TenantHealthGauge score={tn.healthScore} size={36} strokeWidth={4} showLabel={false} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{tn.userCount}</TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">{tn.productCount}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(tn.activeModules || []).slice(0, 2).map(m => (
                        <Badge key={m} variant="secondary" className="text-[10px] h-5 px-1.5">{m.replace(/_/g, ' ')}</Badge>
                      ))}
                      {(tn.activeModules || []).length > 2 && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">+{tn.activeModules.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {formatDate(tn.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setImpersonateTargetId(tn.id)}
                        title={t('Impersonate')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {tn.status === 'active' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setSuspendTargetId(tn.id)}
                          title={t('Sperren')}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setReactivateTargetId(tn.id)}
                          title={t('Reaktivieren')}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild title={t('Öffnen')}>
                        <Link to={`/admin/tenants/${tn.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <ConfirmWithReasonDialog
        open={!!suspendTargetId}
        onOpenChange={(o) => !o && setSuspendTargetId(null)}
        title={t('Tenant sperren')}
        description={t('Alle User-Logins dieses Tenants werden blockiert. Die Aktion wird im Audit-Log protokolliert.')}
        confirmLabel={t('Sperren')}
        confirmVariant="destructive"
        danger
        onConfirm={handleSuspend}
      />

      {/* Reactivate Dialog */}
      <ConfirmWithReasonDialog
        open={!!reactivateTargetId}
        onOpenChange={(o) => !o && setReactivateTargetId(null)}
        title={t('Tenant reaktivieren')}
        description={t('Der Tenant wird wieder aktiv geschaltet. Logins sind danach erneut möglich.')}
        confirmLabel={t('Reaktivieren')}
        reasonRequired={false}
        onConfirm={handleReactivate}
      />

      {/* Impersonate Dialog */}
      <ConfirmWithReasonDialog
        open={!!impersonateTargetId}
        onOpenChange={(o) => !o && setImpersonateTargetId(null)}
        title={t('Impersonation starten')}
        description={t('Du siehst die App aus Sicht dieses Tenants. Alle Aktionen werden protokolliert. Session läuft 30 Min.')}
        confirmLabel={t('Impersonation starten')}
        reasonPlaceholder={t('z.B. "Support-Ticket #42", "Bug reproduzieren"')}
        onConfirm={handleImpersonate}
      />
    </div>
  );
}
