/**
 * Activity Log Viewer
 *
 * Full audit trail across the tenant — every system change that goes
 * through `logActivity()` lands here. Used to answer "who did what,
 * when, with which values" for compliance and debugging.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getActivityLogPaginated } from '@/services/supabase/activity-log';
import type { PaginatedActivityLog } from '@/services/supabase/activity-log';
import { formatDate } from '@/lib/format';

const ACTION_BADGES: Record<string, { className: string; icon?: typeof ArrowUpRight }> = {
  'shopify.inventory_export':           { className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: ArrowUpRight },
  'shopify.inventory_import.observed':  { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: ArrowDownRight },
  'shopify_mapping.delete':             { className: 'bg-red-100 text-red-800 border-red-200' },
  'shopify_mapping.update':             { className: 'bg-amber-100 text-amber-800 border-amber-200' },
  'batch.create':                       { className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'batch.update':                       { className: 'bg-violet-100 text-violet-800 border-violet-200' },
  'variant_fix.start':                  { className: 'bg-zinc-200 text-zinc-700 border-zinc-300' },
  'variant_fix.complete':               { className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

function actionBadge(action: string) {
  return ACTION_BADGES[action] || { className: 'bg-muted text-muted-foreground' };
}

const PAGE_SIZE = 50;

export function ActivityLogPage() {
  const { t } = useTranslation('common');
  const locale = useLocale();

  const [data, setData] = useState<PaginatedActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expanded rows for full details
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const result = await getActivityLogPaginated({
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        userId: userFilter || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, entityTypeFilter, userFilter, dateFrom, dateTo]);

  // Trigger load on search with debounce
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = useMemo(() => data ? Math.ceil(data.total / data.pageSize) : 1, [data]);

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityTypeFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = !!(search || actionFilter || entityTypeFilter || userFilter || dateFrom || dateTo);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('Activity Log')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Complete audit trail — every change in the system, who made it, and what values were touched.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('Reload')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> {t('Filters')}
          </CardTitle>
          <CardDescription className="text-xs">
            {data && (data.total > 0
              ? t('{{count}} entries match', { count: data.total })
              : t('No entries match'))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs">{t('Search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Free text search…')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Action')}</Label>
              <Select value={actionFilter || '_all'} onValueChange={v => { setActionFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('All actions')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('All actions')}</SelectItem>
                  {data?.distinctActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Entity type')}</Label>
              <Select value={entityTypeFilter || '_all'} onValueChange={v => { setEntityTypeFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('All types')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('All types')}</SelectItem>
                  {data?.distinctEntityTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('User')}</Label>
              <Select value={userFilter || '_all'} onValueChange={v => { setUserFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('All users + system')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('All users + system')}</SelectItem>
                  {data?.distinctUsers.map(u => (
                    <SelectItem key={u.userId} value={u.userId}>{u.email || u.userId.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('From')}</Label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('To')}</Label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end">
                {t('Clear filters')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t('When')}</TableHead>
                  <TableHead>{t('Who')}</TableHead>
                  <TableHead>{t('Action')}</TableHead>
                  <TableHead>{t('Entity')}</TableHead>
                  <TableHead>{t('Summary')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><ShimmerSkeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))}

                {!loading && (data?.data.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                      {t('No matching entries')}
                    </TableCell>
                  </TableRow>
                )}

                {!loading && data?.data.map(entry => {
                  const isExpanded = expanded.has(entry.id);
                  const cfg = actionBadge(entry.action);
                  const Icon = cfg.icon;
                  return (
                    <RowFragment
                      key={entry.id}
                      entry={entry}
                      cfg={cfg}
                      Icon={Icon}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(entry.id)}
                      locale={locale}
                      t={t}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm text-muted-foreground">
            {t('Page {{page}} of {{total}}', { page: data.page, total: totalPages })}
            {' · '}
            {t('{{n}} entries', { n: data.total })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
              {t('Previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>
              {t('Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Row + expanded detail
// ============================================

interface RowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfg: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon?: any;
  isExpanded: boolean;
  onToggle: () => void;
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function RowFragment({ entry, cfg, Icon, isExpanded, onToggle, locale, t }: RowProps) {
  const summary = renderSummary(entry, t);
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/40" onClick={onToggle}>
        <TableCell className="px-2">
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </TableCell>
        <TableCell className="text-xs whitespace-nowrap">
          <div>{formatDate(entry.createdAt, locale)}</div>
          <div className="text-muted-foreground">{new Date(entry.createdAt).toLocaleTimeString()}</div>
        </TableCell>
        <TableCell className="text-xs">
          {entry.userId ? (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {entry.actorEmail || entry.userId.slice(0, 8)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground italic">
              <Bot className="h-3.5 w-3.5" /> {t('System')}
            </span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cfg.className + ' text-xs whitespace-nowrap'}>
            {Icon && <Icon className="h-3 w-3 mr-1" />}
            {entry.action}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground">
          {entry.entityType}
          {entry.entityId && <div className="text-[10px]">{entry.entityId.slice(0, 8)}…</div>}
        </TableCell>
        <TableCell className="text-xs max-w-md truncate">{summary}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/20 px-4 py-3">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSummary(entry: any, _t: (s: string, opts?: Record<string, unknown>) => string): string {
  const d = entry.details || {};

  switch (entry.action) {
    case 'shopify.inventory_export':
      return `${d.shopify_product_title}${d.shopify_variant_title ? ` (${d.shopify_variant_title})` : ''} → ${d.shopify_location_name}: ${d.shopify_value_before ?? '?'} → ${d.dpp_value_pushed}`;
    case 'shopify.inventory_import.observed':
      return `${d.shopify_product_title}${d.shopify_variant_title ? ` (${d.shopify_variant_title})` : ''}: Shopify=${d.shopify_value} vs DPP=${d.dpp_value_before} (${d.would_overwrite ? 'differ' : 'match'})`;
    case 'shopify_mapping.delete':
      return `Removed mapping: ${d.shopify_product_title}${d.shopify_variant_title ? ` (${d.shopify_variant_title})` : ''}`;
    case 'shopify_mapping.update':
      return d.reason || JSON.stringify(d).slice(0, 80);
    case 'batch.create':
      return `Cloned from ${d.cloned_from_batch_id?.slice(0, 8)}…, qty=${d.quantity}`;
    case 'batch.update':
      return `Quantity ${d.quantity_before} → ${d.quantity_after} — ${d.reason || ''}`;
    case 'variant_fix.start':
    case 'variant_fix.complete':
      return d.reason || d.migration || '';
    default:
      return JSON.stringify(d).slice(0, 80);
  }
}
