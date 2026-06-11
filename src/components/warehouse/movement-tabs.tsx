/**
 * Breakdown tabs for the warehouse movements page:
 * by category (with previous-period deltas), by recipient, by product
 * (stacked bars) and the audit log (responsive table with mobile cards).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
  type SortState,
} from '@/components/ui/responsive-table';
import { gridStagger, gridItem, useMotionVariants } from '@/lib/motion';
import type { WhStockTransaction } from '@/types/warehouse';
import {
  CATEGORIES, CAT_BY_KEY, categorize, parseReason,
  type CategoryStats, type MovementCategory,
} from './movement-categories';
import { DeltaBadge } from './movement-kpi-strip';

/* -------------------------------------------------------------------------- */
/*  Nach Kategorie                                                             */
/* -------------------------------------------------------------------------- */

export function CategoryTab({ stats, prevStats, totalOutflow, hasComparison }: {
  stats: CategoryStats;
  prevStats: CategoryStats | null;
  totalOutflow: number;
  hasComparison: boolean;
}) {
  const { t } = useTranslation('warehouse');
  const container = useMotionVariants(gridStagger);
  const item = useMotionVariants(gridItem);
  const sorted = [...CATEGORIES].sort((a, b) => stats[b.key].qty - stats[a.key].qty);

  return (
    <motion.div variants={container} initial="initial" animate="animate" className="space-y-2">
      {sorted.map(c => {
        const s = stats[c.key];
        if (s.qty === 0) return null;
        const pct = totalOutflow > 0 && c.isOutflow ? Math.round((s.qty / totalOutflow) * 100) : 0;
        const Icon = c.icon;
        return (
          <motion.div key={c.key} variants={item} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{t(c.labelKey)}</span>
                  {hasComparison && prevStats && (
                    <DeltaBadge current={s.qty} previous={prevStats[c.key].qty} invert={c.invertDelta} />
                  )}
                </span>
                <span className="text-sm tabular-nums font-semibold shrink-0">{s.qty} {t('Stück')}</span>
              </div>
              {c.isOutflow && (
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    key={`${c.key}-${pct}`}
                    className="h-full rounded-full animate-bar-grow"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                {s.count} {t('Buchung(en)')}
                {c.isOutflow && pct > 0 && ` · ${pct}% ${t('aller Abgänge')}`}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nach Empfänger                                                             */
/* -------------------------------------------------------------------------- */

export interface RecipientRow {
  recipient: string;
  category: MovementCategory;
  qty: number;
  count: number;
}

export function RecipientTab({ rows }: { rows: RecipientRow[] }) {
  const { t } = useTranslation('warehouse');
  const container = useMotionVariants(gridStagger);
  const item = useMotionVariants(gridItem);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm max-w-md mx-auto">
          {t('Noch keine Empfänger erfasst — gib bei Werbegeschenken/Tester/Spenden im Ausbuchen-Dialog einen Empfänger an.')}
        </p>
      </div>
    );
  }
  return (
    <motion.div variants={container} initial="initial" animate="animate" className="space-y-2">
      {rows.map((r, i) => {
        const c = CAT_BY_KEY[r.category] || CAT_BY_KEY.other_outflow;
        const Icon = c.icon;
        return (
          <motion.div key={`${r.category}-${r.recipient}-${i}`} variants={item} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm break-words">{r.recipient}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t(c.labelKey)} · {r.count} {t('Buchung(en)')}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold tabular-nums">{r.qty}</div>
              <div className="text-[10px] text-muted-foreground">{t('Stück')}</div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nach Produkt                                                               */
/* -------------------------------------------------------------------------- */

export interface ProductRow {
  productId: string;
  productName: string;
  total: number;
  categories: Record<MovementCategory, number>;
}

export function ProductTab({ rows }: { rows: ProductRow[] }) {
  const { t } = useTranslation('warehouse');
  const container = useMotionVariants(gridStagger);
  const item = useMotionVariants(gridItem);

  return (
    <motion.div variants={container} initial="initial" animate="animate" className="space-y-3">
      {rows.map(p => {
        const segments = CATEGORIES
          .filter(c => c.isOutflow && (p.categories[c.key] || 0) > 0)
          .map(c => ({ ...c, qty: p.categories[c.key] || 0 }));
        return (
          <motion.div key={p.productId} variants={item} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/products/${p.productId}`} className="font-medium text-sm hover:underline text-primary break-words">
                {p.productName}
              </Link>
              <span className="text-sm tabular-nums shrink-0">
                <span className="font-semibold">{p.total}</span>{' '}
                <span className="text-muted-foreground text-xs">{t('Stück gesamt')}</span>
              </span>
            </div>
            {/* Stacked horizontal bar — grows in from the left */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted animate-bar-grow">
              {segments.map(s => (
                <div
                  key={s.key}
                  className="h-full"
                  style={{ width: `${(s.qty / p.total) * 100}%`, backgroundColor: s.color }}
                  title={`${t(s.labelKey)}: ${s.qty}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {segments.map(s => {
                const Icon = s.icon;
                return (
                  <Badge
                    key={s.key}
                    variant="outline"
                    className="text-[10px] gap-1 font-normal"
                    style={{ borderColor: s.color, color: s.color }}
                  >
                    <Icon className="h-3 w-3" />
                    {t(s.labelKey)}: <span className="font-semibold tabular-nums">{s.qty}</span>
                  </Badge>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Audit Log — ResponsiveTable (mobile: cards with title/badge/meta)          */
/* -------------------------------------------------------------------------- */

export function AuditLogTab({ rows, userMap, locale }: {
  rows: WhStockTransaction[];
  userMap: Record<string, string>;
  locale: string;
}) {
  const { t } = useTranslation('warehouse');
  const [sort, setSort] = useState<SortState>({ by: 'date', order: 'desc' });

  const sorted = useMemo(() => {
    const list = [...rows];
    const dir = sort.order === 'asc' ? 1 : -1;
    if (sort.by === 'qty') {
      list.sort((a, b) => ((a.quantity || 0) - (b.quantity || 0)) * dir);
    } else {
      list.sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir);
    }
    return list;
  }, [rows, sort]);

  const columns = useMemo<ResponsiveTableColumn<WhStockTransaction>[]>(() => [
    {
      id: 'date',
      header: t('Datum'),
      sortable: true,
      mobilePriority: 'meta',
      cell: txn => (
        <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
          {new Date(txn.createdAt).toLocaleString(locale, {
            year: '2-digit', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      id: 'category',
      header: t('Kategorie'),
      mobilePriority: 'badge',
      cell: txn => {
        const c = CAT_BY_KEY[categorize(txn)] || CAT_BY_KEY.other_outflow;
        const Icon = c.icon;
        return (
          <Badge variant="outline" className="gap-1 font-normal" style={{ borderColor: c.color, color: c.color }}>
            <Icon className="h-3 w-3" /> {t(c.labelKey)}
          </Badge>
        );
      },
    },
    {
      id: 'product',
      header: t('Produkt'),
      mobilePriority: 'title',
      cell: txn => txn.productId ? (
        <Link to={`/products/${txn.productId}`} className="font-medium text-sm hover:underline text-primary">
          {txn.productName || txn.productId.slice(0, 8)}
        </Link>
      ) : '—',
    },
    {
      id: 'batch',
      header: t('Charge / Standort'),
      hideBelow: 'md',
      cell: txn => (
        <div className="text-xs text-muted-foreground">
          {txn.batchSerialNumber && <div className="font-mono">{txn.batchSerialNumber}</div>}
          {txn.locationName && <div>{txn.locationName}</div>}
        </div>
      ),
    },
    {
      id: 'qty',
      header: <span className="block text-right w-full">{t('Menge')}</span>,
      sortable: true,
      mobilePriority: 'meta',
      mobileLabel: t('Menge'),
      className: 'text-right',
      cell: txn => {
        const qty = txn.quantity || 0;
        const isOut = qty < 0;
        return (
          <span className={`tabular-nums font-semibold whitespace-nowrap ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
            {isOut ? <TrendingDown className="inline h-3 w-3 mr-0.5" /> : <TrendingUp className="inline h-3 w-3 mr-0.5" />}
            {qty > 0 ? '+' : ''}{qty}
          </span>
        );
      },
    },
    {
      id: 'reason',
      header: t('Grund / Empfänger'),
      mobilePriority: 'subtitle',
      cell: txn => {
        const parsed = parseReason(txn.reason);
        return (
          <div className="text-xs">
            {parsed.label && <div className="break-words">{parsed.label}</div>}
            {parsed.recipient && <div className="text-muted-foreground italic break-words">{parsed.recipient}</div>}
            {!parsed.label && txn.reason && <div className="break-words text-muted-foreground">{txn.reason}</div>}
            {txn.notes && <div className="text-muted-foreground mt-0.5 break-words">{txn.notes}</div>}
            {txn.shipmentId && (
              <Link to={`/warehouse/shipments/${txn.shipmentId}`} className="text-primary hover:underline text-[11px]">
                {t('Sendung')} →
              </Link>
            )}
          </div>
        );
      },
    },
    {
      id: 'by',
      header: t('Durch'),
      hideBelow: 'lg',
      cell: txn => (
        <span className="text-xs text-muted-foreground">
          {txn.performedBy ? userMap[txn.performedBy] || txn.performedBy.slice(0, 8) : '—'}
        </span>
      ),
    },
  ], [t, locale, userMap]);

  return (
    <ResponsiveTable
      data={sorted}
      columns={columns}
      rowKey={txn => txn.id}
      sort={sort}
      onSortChange={setSort}
      emptyState={<p className="text-sm text-muted-foreground">{t('Keine Bewegungen für diese Filter')}</p>}
    />
  );
}
