import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Search, TrendingUp, RefreshCw, ExternalLink, Download, Tag as TagIcon, X, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { HealthGauge } from '@/components/crm/HealthGauge';
import { CreateCustomerDialog } from '@/components/crm/CreateCustomerDialog';
import {
  getCustomerList, refreshTenantHealthScores, bulkAddTag, customersToCSV,
  type CrmCustomer, type RfmSegment, type CustomerListFilter,
} from '@/services/supabase/crm-analytics';
import { toast } from 'sonner';

const SEGMENT_OPTIONS: { value: RfmSegment; label: string; tone: string }[] = [
  { value: 'champion',    label: 'Champions',    tone: 'bg-purple-100 text-purple-900 border-purple-300' },
  { value: 'loyal',       label: 'Treue',         tone: 'bg-green-100 text-green-900 border-green-300' },
  { value: 'potential',   label: 'Potenziale',   tone: 'bg-sky-100 text-sky-900 border-sky-300' },
  { value: 'new',         label: 'Neulinge',     tone: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { value: 'at_risk',     label: 'Gefährdet',    tone: 'bg-amber-100 text-amber-900 border-amber-300' },
  { value: 'hibernating', label: 'Schlummernd',  tone: 'bg-orange-100 text-orange-900 border-orange-300' },
  { value: 'lost',        label: 'Verloren',     tone: 'bg-red-100 text-red-900 border-red-300' },
];

function segmentTone(seg?: string) {
  return SEGMENT_OPTIONS.find(s => s.value === seg)?.tone || 'bg-muted text-muted-foreground';
}
function segmentLabel(seg?: string) {
  return SEGMENT_OPTIONS.find(s => s.value === seg)?.label || (seg || '—');
}

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

function relativeDaysAgo(iso?: string): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 30) return `vor ${days} Tagen`;
  if (days < 365) return `vor ${Math.floor(days / 30)} Monaten`;
  return `vor ${Math.floor(days / 365)} Jahren`;
}

export function CustomerListPage() {
  const { t } = useTranslation('warehouse');
  const [data, setData] = useState<CrmCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'total_spent' | 'total_orders' | 'last_order_at' | 'created_at'>('total_spent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const filter: CustomerListFilter = {
      search: search.trim() || undefined,
      rfmSegments: segment !== 'all' ? [segment as RfmSegment] : undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    };
    const { data, total } = await getCustomerList(filter);
    setData(data);
    setTotal(total);
    setLoading(false);
  }, [search, segment, sortBy, sortDir, page]);

  useEffect(() => { load(); }, [load]);

  async function handleRecomputeRFM() {
    setRefreshing(true);
    try {
      const n = await refreshTenantHealthScores();
      toast.success(t('{{count}} Kunden aktualisiert', { count: n }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

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
      if (prev.size === data.length) return new Set();
      return new Set(data.map(c => c.id));
    });
  }
  function clearSelection() { setSelected(new Set()); }

  async function handleBulkAddTag() {
    const tag = tagDraft.trim();
    if (!tag || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const n = await bulkAddTag(Array.from(selected), tag);
      toast.success(t('Tag „{{tag}}" zu {{n}} Kunden hinzugefügt', { tag, n }));
      setTagDraft('');
      setTagDialogOpen(false);
      clearSelection();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleExportCSV() {
    // Export selection if any, else current page
    const ids = selected.size > 0 ? Array.from(selected) : null;
    const rows = ids ? data.filter(c => ids.includes(c.id)) : data;
    const csv = customersToCSV(rows);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kunden_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('{{n}} Kunden als CSV exportiert', { n: rows.length }));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('Kunden')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {total.toLocaleString('de-DE')} {t('Kunden gesamt')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t('CSV Export')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecomputeRFM} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Neu berechnen')}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('Neuer Kunde')}
          </Button>
        </div>
      </div>

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setPage(1); load(); }}
      />

      {/* Bulk Selection Toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center gap-2 rounded-xl border bg-primary text-primary-foreground px-4 py-2.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <Badge variant="secondary" className="tabular-nums">{selected.size}</Badge>
          <span className="text-sm font-medium">{t('ausgewählt')}</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => setTagDialogOpen(true)}>
            <TagIcon className="h-3.5 w-3.5 mr-1" />
            {t('Tag hinzufügen')}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            {t('Export Auswahl')}
          </Button>
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={clearSelection} aria-label={t('Auswahl aufheben')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Suche: E-Mail, Name, Firma')}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={segment} onValueChange={v => { setSegment(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('Alle Segmente')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('Alle Segmente')}</SelectItem>
                {SEGMENT_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortDir}`} onValueChange={v => {
              const [col, dir] = v.split('-') as [typeof sortBy, typeof sortDir];
              setSortBy(col); setSortDir(dir);
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_spent-desc">CLV absteigend</SelectItem>
                <SelectItem value="total_spent-asc">CLV aufsteigend</SelectItem>
                <SelectItem value="total_orders-desc">Bestellungen absteigend</SelectItem>
                <SelectItem value="last_order_at-desc">Neueste Bestellung</SelectItem>
                <SelectItem value="created_at-desc">Zuletzt angelegt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={data.length > 0 && selected.size === data.length}
                      onCheckedChange={toggleAll}
                      aria-label={t('Alle auswählen')}
                    />
                  </TableHead>
                  <TableHead>{t('Kunde')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Segment')}</TableHead>
                  <TableHead className="text-center hidden md:table-cell">{t('Health')}</TableHead>
                  <TableHead className="text-right">{t('Bestellungen')}</TableHead>
                  <TableHead className="text-right">{t('CLV')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">{t('Ø Bestellwert')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Letzte Bestellung')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t('Shopify')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><ShimmerSkeleton className="h-8" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      {t('Keine Kunden gefunden')}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(c => (
                    <TableRow key={c.id} className={`hover:bg-muted/50 ${selected.has(c.id) ? 'bg-primary/5' : ''}`}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleOne(c.id)}
                          aria-label={t('Kunde auswählen')}
                          onClick={e => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <Link to={`/crm/customers/${c.id}`} className="block">
                          <div className="font-medium text-primary hover:underline">
                            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id.slice(0, 8)}
                          </div>
                          {c.email && <div className="text-xs text-muted-foreground truncate max-w-xs">{c.email}</div>}
                          {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {c.rfmSegment ? (
                          <Badge variant="outline" className={segmentTone(c.rfmSegment)}>{segmentLabel(c.rfmSegment)}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <HealthGauge score={c.healthScore} size={40} strokeWidth={5} showLabel={false} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.totalOrders}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmtEuro(c.totalSpent)}
                        {c.rfmSegment === 'champion' && <TrendingUp className="h-3 w-3 inline ml-1 text-purple-600" />}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">
                        {c.avgOrderValue > 0 ? fmtEuro(c.avgOrderValue) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {relativeDaysAgo(c.lastOrderAt)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {c.shopifyCustomerId ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {c.shopifyCustomerId}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground">
            {t('Seite')} {page} / {totalPages} ({total} {t('Kunden')})
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Zurück')}</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('Weiter')}</Button>
          </div>
        </div>
      )}

      {/* Bulk Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              {t('Tag zu {{n}} Kunden hinzufügen', { n: selected.size })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="bulk-tag">{t('Tag-Name')}</Label>
            <Input
              id="bulk-tag"
              autoFocus
              value={tagDraft}
              onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && tagDraft.trim()) handleBulkAddTag(); }}
              placeholder="z.B. VIP, Wiederkäufer, B2B"
            />
            <p className="text-xs text-muted-foreground">
              {t('Kunden, die das Tag schon haben, werden übersprungen.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>{t('Abbrechen')}</Button>
            <Button onClick={handleBulkAddTag} disabled={!tagDraft.trim() || bulkBusy}>
              {bulkBusy ? '…' : t('Hinzufügen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
