/**
 * TransferListPage — stock transfers between warehouse locations.
 *
 * History rendered as a timeline (transfer_out/transfer_in pairs merged
 * into single "From → To" entries), creation handled by the visual
 * journey dialog (TransferCreateDialog).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRightLeft, Plus, CalendarDays, Boxes, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTransactionHistory } from '@/services/supabase/wh-stock';
import { TransferCreateDialog } from '@/components/warehouse/transfer-create-dialog';
import { TransferTimeline, type TransferEntry } from '@/components/warehouse/transfer-timeline';
import { relativeTime } from '@/lib/animations';
import { blurIn, gridStagger, gridItem } from '@/lib/motion';
import type { WhStockTransaction } from '@/types/warehouse';

/**
 * Merge transfer_out / transfer_in transaction pairs (linked via
 * relatedTransactionId) into single timeline entries with both ends.
 */
function pairTransfers(txs: WhStockTransaction[]): TransferEntry[] {
  const byId = new Map(txs.map((tx) => [tx.id, tx]));
  const consumed = new Set<string>();
  const entries: TransferEntry[] = [];

  for (const tx of txs) {
    if (consumed.has(tx.id)) continue;
    consumed.add(tx.id);

    const partner = tx.relatedTransactionId ? byId.get(tx.relatedTransactionId) : undefined;
    if (partner && !consumed.has(partner.id)) consumed.add(partner.id);

    const out = tx.type === 'transfer_out' ? tx : partner?.type === 'transfer_out' ? partner : undefined;
    const inn = tx.type === 'transfer_in' ? tx : partner?.type === 'transfer_in' ? partner : undefined;
    const base = out || inn;
    if (!base) continue;

    entries.push({
      id: base.id,
      transactionNumber: base.transactionNumber,
      productName: base.productName || base.productId.slice(0, 8),
      batchSerialNumber: base.batchSerialNumber,
      quantity: Math.abs(base.quantity),
      fromName: out?.locationName,
      toName: inn?.locationName,
      notes: base.notes,
      createdAt: base.createdAt,
    });
  }

  return entries;
}

export function TransferListPage() {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  const [transactions, setTransactions] = useState<WhStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(false);
    try {
      const data = await getTransactionHistory({ type: ['transfer_out', 'transfer_in'] });
      setTransactions(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => pairTransfers(transactions), [transactions]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const cutoff30d = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    let today = 0;
    let units30d = 0;
    for (const e of entries) {
      const d = new Date(e.createdAt);
      if (d.toDateString() === todayStr) today++;
      if (d.getTime() >= cutoff30d) units30d += e.quantity;
    }
    return { today, units30d, last: entries[0]?.createdAt };
  }, [entries]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        variants={prefersReduced ? undefined : blurIn}
        initial={prefersReduced ? undefined : 'initial'}
        animate={prefersReduced ? undefined : 'animate'}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Stock Transfers')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('Move stock between locations')}</p>
        </div>
        <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }} className="shrink-0">
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto h-11">
            <Plus className="mr-2 h-4 w-4" />
            {t('New Transfer')}
          </Button>
        </motion.div>
      </motion.div>

      {/* Stat chips */}
      <motion.div
        variants={prefersReduced ? undefined : gridStagger}
        initial={prefersReduced ? undefined : 'initial'}
        animate={prefersReduced ? undefined : 'animate'}
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        {[
          {
            icon: CalendarDays,
            label: t('Transfers today'),
            value: loading ? '–' : String(stats.today),
            accent: 'text-primary bg-primary/10',
          },
          {
            icon: Boxes,
            label: t('Units moved (30d)'),
            value: loading ? '–' : String(stats.units30d),
            accent: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950',
          },
          {
            icon: History,
            label: t('Last transfer'),
            value: loading ? '–' : stats.last ? relativeTime(stats.last, i18n.language) : '—',
            accent: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950',
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={prefersReduced ? undefined : gridItem}>
            <Card className="h-full">
              <CardContent className="flex items-center gap-2.5 p-3 sm:p-4">
                <div className={`hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.accent}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] sm:text-xs text-muted-foreground">{stat.label}</p>
                  <p className="truncate text-sm sm:text-lg font-bold tabular-nums">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            {t('Transfer History')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TransferTimeline
            entries={entries}
            loading={loading}
            error={error}
            onRetry={() => load()}
            onNewTransfer={() => setDialogOpen(true)}
          />
        </CardContent>
      </Card>

      <TransferCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => load(false)}
      />
    </div>
  );
}
