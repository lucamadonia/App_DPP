/**
 * Batch Units Card — shown on BatchDetailPage when unit_tracking_enabled.
 *
 * Displays:
 * - Aggregate stats (total / received / missing)
 * - Progress bar
 * - Tabs: Missing | Received | All
 * - Per-unit row with status badge, location, received_at
 * - Action: copy missing-serial list, generate more units, GS1 link per unit
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScanLine,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  getUnitsByBatch,
  getBatchUnitStats,
  generateExpectedUnits,
} from '@/services/supabase/inventory-units';
import type { InventoryUnit, BatchUnitStats, InventoryUnitStatus } from '@/types/inventory-units';

interface BatchUnitsCardProps {
  batchId: string;
  productGtin: string;
  batchSerial: string;
}

const STATUS_BADGE: Record<InventoryUnitStatus, { label: string; className: string }> = {
  expected:   { label: 'Expected',   className: 'bg-amber-100 text-amber-800 border-amber-200' },
  received:   { label: 'Received',   className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  reserved:   { label: 'Reserved',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped:    { label: 'Shipped',    className: 'bg-violet-100 text-violet-800 border-violet-200' },
  damaged:    { label: 'Damaged',    className: 'bg-red-100 text-red-800 border-red-200' },
  quarantine: { label: 'Quarantine', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  returned:   { label: 'Returned',   className: 'bg-sky-100 text-sky-800 border-sky-200' },
  lost:       { label: 'Lost',       className: 'bg-zinc-200 text-zinc-700 border-zinc-300' },
  consumed:   { label: 'Consumed',   className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
};

export function BatchUnitsCard({ batchId, productGtin, batchSerial }: BatchUnitsCardProps) {
  const { t } = useTranslation('products');
  const [stats, setStats] = useState<BatchUnitStats | null>(null);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'missing' | 'received' | 'all'>('missing');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [genOpen, setGenOpen] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genPrefix, setGenPrefix] = useState('');
  const [genStart, setGenStart] = useState(1);
  const [genPadding, setGenPadding] = useState(3);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [s, u] = await Promise.all([
      getBatchUnitStats(batchId),
      getUnitsByBatch(batchId),
    ]);
    setStats(s);
    setUnits(u);
    setIsLoading(false);
    // Default the new-unit "start" to the next number after last existing
    if (u.length > 0) {
      const maxNum = u
        .map(unit => {
          const match = unit.unitSerial.match(/(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .reduce((a, b) => Math.max(a, b), 0);
      setGenStart(maxNum + 1);
      // Try to derive prefix from the first unit
      const first = u[0].unitSerial;
      const match = first.match(/^(.*?)(\d+)$/);
      if (match) {
        setGenPrefix(match[1]);
        setGenPadding(match[2].length);
      }
    } else {
      setGenPrefix(`${batchSerial}-`);
    }
  }, [batchId, batchSerial]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredUnits = useMemo(() => {
    if (tab === 'missing') return units.filter(u => u.status === 'expected');
    if (tab === 'received') return units.filter(u => u.status === 'received');
    return units;
  }, [units, tab]);

  const copyMissingSerials = async () => {
    if (!stats?.missingSerials.length) return;
    try {
      await navigator.clipboard.writeText(stats.missingSerials.join('\n'));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      console.error('Clipboard failed:', err);
    }
  };

  const handleGenerate = async () => {
    setGenBusy(true);
    setGenError(null);
    const result = await generateExpectedUnits({
      batchId,
      count: genCount,
      serialPrefix: genPrefix,
      startNumber: genStart,
      padding: genPadding,
    });
    setGenBusy(false);
    if (!result.success) {
      setGenError(result.error || 'Unknown error');
      return;
    }
    setGenOpen(false);
    await refresh();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {t('Per-Unit Tracking')}
          </CardTitle>
          <CardDescription>{t('No units have been generated for this batch yet.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setGenOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('Generate Units')}
          </Button>
          <GenerateUnitsDialog
            open={genOpen}
            onOpenChange={setGenOpen}
            count={genCount} setCount={setGenCount}
            prefix={genPrefix} setPrefix={setGenPrefix}
            start={genStart} setStart={setGenStart}
            padding={genPadding} setPadding={setGenPadding}
            busy={genBusy}
            error={genError}
            onGenerate={handleGenerate}
            t={t}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              {t('Per-Unit Tracking')}
            </CardTitle>
            <CardDescription>
              {t('Each unit can be scanned individually. Missing units are still expected to be received.')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setGenOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Units')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <StatBox
            icon={<ScanLine className="h-4 w-4" />}
            label={t('Total')}
            value={stats.total}
          />
          <StatBox
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label={t('Received')}
            value={stats.received}
            highlight="emerald"
          />
          <StatBox
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            label={t('Missing')}
            value={stats.expected}
            highlight="amber"
          />
          <StatBox
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            label={t('Damaged + Lost')}
            value={stats.damaged + stats.lost}
            highlight={stats.damaged + stats.lost > 0 ? 'red' : undefined}
          />
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('Reception progress')}</span>
            <span className="font-medium">{stats.receivedPercent}%</span>
          </div>
          <Progress value={stats.receivedPercent} />
        </div>

        {/* Missing serials quick-action */}
        {stats.missingSerials.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-amber-50/50 p-3">
            <div className="text-sm">
              <strong className="text-amber-900">
                {t('{{count}} units still missing', { count: stats.missingSerials.length })}
              </strong>
              <p className="text-xs text-amber-800/70 font-mono mt-1">
                {stats.missingSerials.slice(0, 5).join(', ')}
                {stats.missingSerials.length > 5 && ` … +${stats.missingSerials.length - 5}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={copyMissingSerials}>
              <Copy className="mr-2 h-3 w-3" />
              {copyState === 'copied' ? t('Copied!') : t('Copy all')}
            </Button>
          </div>
        )}

        {/* Tabs with units */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'missing' | 'received' | 'all')}>
          <TabsList>
            <TabsTrigger value="missing">
              {t('Missing')} <Badge variant="secondary" className="ml-2">{stats.expected}</Badge>
            </TabsTrigger>
            <TabsTrigger value="received">
              {t('Received')} <Badge variant="secondary" className="ml-2">{stats.received}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all">
              {t('All')} <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {filteredUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tab === 'missing' && stats.expected === 0
                  ? t('All units are accounted for.')
                  : t('No units in this view.')}
              </p>
            ) : (
              <div className="rounded-md border max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50 backdrop-blur">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">{t('Serial')}</th>
                      <th className="px-3 py-2 font-medium">{t('Status')}</th>
                      <th className="px-3 py-2 font-medium">{t('Location')}</th>
                      <th className="px-3 py-2 font-medium">{t('Received')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('DPP')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUnits.map(unit => {
                      const cfg = STATUS_BADGE[unit.status];
                      return (
                        <tr key={unit.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{unit.unitSerial}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {unit.locationName || '—'}
                            {unit.binLocation && (
                              <span className="text-xs"> · {unit.binLocation}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {unit.receivedAt
                              ? new Date(unit.receivedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <a
                              href={`/01/${productGtin}/21/${unit.unitSerial}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <GenerateUnitsDialog
          open={genOpen}
          onOpenChange={setGenOpen}
          count={genCount} setCount={setGenCount}
          prefix={genPrefix} setPrefix={setGenPrefix}
          start={genStart} setStart={setGenStart}
          padding={genPadding} setPadding={setGenPadding}
          busy={genBusy}
          error={genError}
          onGenerate={handleGenerate}
          t={t}
        />
      </CardContent>
    </Card>
  );
}

// ============================================
// Stat box
// ============================================

function StatBox({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: 'emerald' | 'amber' | 'red';
}) {
  const ringClass = highlight === 'emerald'
    ? 'border-emerald-200 bg-emerald-50/50'
    : highlight === 'amber'
    ? 'border-amber-200 bg-amber-50/50'
    : highlight === 'red'
    ? 'border-red-200 bg-red-50/50'
    : '';

  return (
    <div className={`rounded-lg border p-3 ${ringClass}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

// ============================================
// Generate dialog
// ============================================

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number; setCount: (n: number) => void;
  prefix: string; setPrefix: (s: string) => void;
  start: number; setStart: (n: number) => void;
  padding: number; setPadding: (n: number) => void;
  busy: boolean;
  error: string | null;
  onGenerate: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function GenerateUnitsDialog({
  open, onOpenChange,
  count, setCount,
  prefix, setPrefix,
  start, setStart,
  padding, setPadding,
  busy, error, onGenerate, t,
}: GenerateDialogProps) {
  const previewFirst = `${prefix}${String(start).padStart(padding, '0')}`;
  const previewLast = `${prefix}${String(start + count - 1).padStart(padding, '0')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><span /></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Generate Expected Units')}</DialogTitle>
          <DialogDescription>
            {t('Bulk-create expected unit rows. Each unit becomes individually scannable with its own GS1 Digital Link QR.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Count')}</label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Start Number')}</label>
              <Input
                type="number"
                min={1}
                value={start}
                onChange={(e) => setStart(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Serial Prefix')}</label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Number Padding')}</label>
              <Input
                type="number"
                min={1}
                max={6}
                value={padding}
                onChange={(e) => setPadding(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground mb-1">{t('Preview')}</div>
            <div className="font-mono text-sm">
              {previewFirst} … {previewLast}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button onClick={onGenerate} disabled={busy || count < 1}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Generate {{count}} units', { count })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
