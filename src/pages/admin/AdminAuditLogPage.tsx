/**
 * Admin Audit-Log Viewer — paginierte Liste aller admin_audit_log-Einträge
 * mit Filtern, Expand-to-Diff und CSV-Export.
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollText, Search, ChevronDown, ChevronRight, Download, RefreshCw,
  User as UserIcon, Clock, Globe, Monitor,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { listAuditLog } from '@/services/supabase/admin';
import type { AdminAuditEntry } from '@/types/admin-extended';
import { toast } from 'sonner';

const ACTION_TONE: Record<string, string> = {
  // destructive
  suspend_tenant: 'bg-red-50 text-red-700 border-red-200',
  delete_feature_flag: 'bg-red-50 text-red-700 border-red-200',
  issue_refund: 'bg-red-50 text-red-700 border-red-200',
  // privileged
  impersonate_start: 'bg-amber-50 text-amber-700 border-amber-200',
  impersonate_end: 'bg-slate-100 text-slate-600 border-slate-200',
  toggle_super_admin: 'bg-amber-50 text-amber-700 border-amber-200',
  // creative
  create_feature_flag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update_feature_flag: 'bg-sky-50 text-sky-700 border-sky-200',
  reactivate_tenant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // defaults
  update_tenant_plan: 'bg-violet-50 text-violet-700 border-violet-200',
  adjust_credits: 'bg-sky-50 text-sky-700 border-sky-200',
};

function toneForAction(action: string): string {
  return ACTION_TONE[action] || 'bg-slate-50 text-slate-700 border-slate-200';
}

export function AdminAuditLogPage() {
  const { t, i18n } = useTranslation('admin');
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';

  function relativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return t('just now');
    if (min < 60) return t('{{n}} min ago', { n: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t('{{n}} h ago', { n: hr });
    const d = Math.floor(hr / 24);
    if (d < 30) return t('{{n}} days ago', { n: d });
    return new Date(iso).toLocaleDateString(dateLocale);
  }

  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { entries: data, total: t } = await listAuditLog({
        action: actionFilter === 'all' ? undefined : actionFilter,
        targetType: targetTypeFilter === 'all' ? undefined : targetTypeFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setEntries(data);
      setTotal(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [actionFilter, targetTypeFilter, page]);

  const allActions = useMemo(() => {
    const s = new Set(entries.map(e => e.action));
    return Array.from(s).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.adminEmail.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.targetLabel || '').toLowerCase().includes(q) ||
      (e.reason || '').toLowerCase().includes(q),
    );
  }, [entries, search]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExportCSV() {
    const headers = [t('Timestamp'), t('Admin'), t('Action'), t('Target Type'), t('Target Label'), t('Target ID'), t('Reason'), 'IP', t('Changes')];
    const rows = filtered.map(e => [
      e.createdAt,
      e.adminEmail,
      e.action,
      e.targetType,
      e.targetLabel || '',
      e.targetId || '',
      e.reason || '',
      e.ipAddress || '',
      JSON.stringify(e.changes || {}),
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(v => {
        const s = String(v ?? '');
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';')
    ).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('{{n}} entries exported', { n: filtered.length }));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ScrollText className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{t('Audit Log')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('All super admin actions are logged here. {{total}} entries total.', { total })}
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
            {t('Reload')}
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
                placeholder={t('Search: admin email, action, target, reason')}
                className="pl-8 h-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder={t('Action')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Actions')}</SelectItem>
                {allActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder={t('Target Type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types')}</SelectItem>
                <SelectItem value="tenant">{t('Tenant')}</SelectItem>
                <SelectItem value="user">{t('User')}</SelectItem>
                <SelectItem value="coupon">{t('Coupon')}</SelectItem>
                <SelectItem value="credit">{t('Credit')}</SelectItem>
                <SelectItem value="feature_flag">{t('Feature Flag')}</SelectItem>
                <SelectItem value="webhook">{t('Webhook')}</SelectItem>
                <SelectItem value="impersonation">{t('Impersonation')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => <ShimmerSkeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              {t('No entries found')}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(e => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(e.id)}
                    className="w-full text-left hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 p-3">
                      <div className="mt-0.5">
                        {expanded.has(e.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${toneForAction(e.action)} font-mono text-[10px] h-5 px-2`}>
                            {e.action}
                          </Badge>
                          <span className="text-sm truncate">
                            {e.targetLabel || (e.targetId ? e.targetId.slice(0, 8) : '—')}
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{e.targetType}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{e.adminEmail}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(e.createdAt)}</span>
                          {e.ipAddress && (
                            <span className="flex items-center gap-1 hidden md:inline-flex">
                              <Globe className="h-3 w-3" />{e.ipAddress}
                            </span>
                          )}
                        </div>
                        {e.reason && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 italic mt-1 truncate">
                            „{e.reason}"
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {expanded.has(e.id) && (
                    <div className="px-12 pb-4 space-y-2 bg-muted/30 border-t">
                      <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <Meta label={t('Timestamp')} value={new Date(e.createdAt).toLocaleString(dateLocale)} />
                        <Meta label={t('Admin ID')} value={e.adminId || '—'} mono />
                        <Meta label={t('Target ID')} value={e.targetId || '—'} mono />
                        <Meta label="IP" value={e.ipAddress || '—'} />
                      </div>
                      {e.userAgent && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">User Agent:</span>
                          <div className="font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Monitor className="h-3 w-3 shrink-0" />
                            <span className="truncate">{e.userAgent}</span>
                          </div>
                        </div>
                      )}
                      {e.changes && Object.keys(e.changes).length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                            {t('Changes')}
                          </div>
                          <pre className="rounded-md bg-background border p-2 text-[11px] font-mono overflow-x-auto">
                            {JSON.stringify(e.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>{t('Page {{page}} / {{pages}} · {{total}} entries', { page, pages: totalPages, total })}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Back')}</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
