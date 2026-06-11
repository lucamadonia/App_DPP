/**
 * PackagingUsageTab — packaging material weight analytics for a date range.
 *
 * Self-contained: loads its own data via getPackagingUsage({ from, to }).
 * Shows KPI cards, a stacked outer-vs-product timeline, material distribution
 * bars, a per-carton-type table and a CSV export.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Box, Download, Layers, Package, PackageOpen, Scale } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-feedback';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import {
  getPackagingUsage,
  type PackagingUsageResult,
} from '@/services/supabase/wh-packaging-usage';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import {
  LUCID_MATERIAL_NAMES_DE,
  LUCID_MATERIAL_NAMES_EN,
  type LucidMaterial,
} from '@/types/compliance';
import { toast } from 'sonner';

const OUTER_COLOR = '#3B82F6';
const PRODUCT_COLOR = '#10B981';

interface PackagingUsageTabProps {
  /** ISO timestamp (inclusive range start, e.g. start of day). */
  from: string;
  /** ISO timestamp (inclusive range end, e.g. end of day). */
  to: string;
}

function materialLabel(material: string, lang: string): string {
  const names = lang.startsWith('de') ? LUCID_MATERIAL_NAMES_DE : LUCID_MATERIAL_NAMES_EN;
  if (material in names) return names[material as LucidMaterial];
  return material.charAt(0).toUpperCase() + material.slice(1);
}

function Kpi({
  icon,
  label,
  value,
  decimals,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  decimals?: number;
  suffix: string;
}) {
  return (
    <GlassCard enableGlow className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-lg sm:text-2xl font-bold tabular-nums">
        <AnimatedCounter value={value} decimals={decimals ?? 0} suffix={suffix} />
      </div>
    </GlassCard>
  );
}

export function PackagingUsageTab({ from, to }: PackagingUsageTabProps) {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const [data, setData] = useState<PackagingUsageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPackagingUsage({ from, to });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPackagingUsage({ from, to });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  function handleExportCSV() {
    if (!data) return;
    type Row = PackagingUsageResult['timeline'][number];
    const cols: CsvColumn<Row>[] = [
      { header: t('Date'), value: (r) => r.date },
      { header: `${t('Outer packaging')} (kg)`, value: (r) => r.outerKg.toFixed(3) },
      { header: `${t('Product packaging')} (kg)`, value: (r) => r.productKg.toFixed(3) },
      { header: `${t('Total', { ns: 'common' })} (kg)`, value: (r) => (r.outerKg + r.productKg).toFixed(3) },
    ];
    const csv = buildCsv(data.timeline, cols);
    downloadCsv(timestampedFilename('packaging-usage'), csv);
    toast.success(t('Exported {{n}} days', { n: data.timeline.length }));
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-20" />
          ))}
        </div>
        <ShimmerSkeleton className="h-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ShimmerSkeleton className="h-48" />
          <ShimmerSkeleton className="h-48" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return <ErrorState title={t('Failed to load packaging data')} message={error} onRetry={load} />;
  }

  // ── Empty ────────────────────────────────────────────────────
  if (!data || data.totals.shipmentCount === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={t('No shipments in this range')}
        description={t('Packaging weights appear here once shipments exist in the selected period.')}
      />
    );
  }

  const { totals, byMaterial, byPackagingType, timeline } = data;
  const maxMaterialKg = Math.max(...byMaterial.map((m) => m.outerKg + m.productKg), 0.001);
  const chartData = timeline.map((p) => ({ ...p, day: p.date.slice(5) }));
  const entrance = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

  return (
    <div className="space-y-4">
      {/* Header row with export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate">{t('Packaging material')}</h2>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>

      {/* KPI row — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi
          icon={<Scale className="h-4 w-4" />}
          label={t('Total packaging weight')}
          value={totals.totalKg}
          decimals={2}
          suffix=" kg"
        />
        <Kpi
          icon={<Box className="h-4 w-4" />}
          label={t('Outer packaging')}
          value={totals.outerKg}
          decimals={2}
          suffix=" kg"
        />
        <Kpi
          icon={<Package className="h-4 w-4" />}
          label={t('Product packaging')}
          value={totals.productKg}
          decimals={2}
          suffix=" kg"
        />
        <Kpi
          icon={<PackageOpen className="h-4 w-4" />}
          label={t('Avg per shipment')}
          value={totals.avgPerShipmentG}
          suffix=" g"
        />
      </div>

      {/* Stacked timeline */}
      <motion.div {...entrance}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('Packaging weight over time')}
            </CardTitle>
            <CardDescription>{t('Outer vs product packaging per day')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pkgOuterFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={OUTER_COLOR} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={OUTER_COLOR} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="pkgProductFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRODUCT_COLOR} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={PRODUCT_COLOR} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={42} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)} kg`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="outerKg"
                    stackId="pkg"
                    stroke={OUTER_COLOR}
                    strokeWidth={2}
                    fill="url(#pkgOuterFill)"
                    name={t('Outer packaging')}
                    isAnimationActive={!prefersReduced}
                  />
                  <Area
                    type="monotone"
                    dataKey="productKg"
                    stackId="pkg"
                    stroke={PRODUCT_COLOR}
                    strokeWidth={2}
                    fill="url(#pkgProductFill)"
                    name={t('Product packaging')}
                    isAnimationActive={!prefersReduced}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Material distribution — horizontal stacked bars */}
        <motion.div {...entrance}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{t('Material distribution')}</CardTitle>
              <CardDescription className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: OUTER_COLOR }} />
                  {t('Outer packaging')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PRODUCT_COLOR }} />
                  {t('Product packaging')}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {byMaterial.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('No data in range')}
                </p>
              ) : (
                byMaterial.map((m) => {
                  const total = m.outerKg + m.productKg;
                  const widthPct = (total / maxMaterialKg) * 100;
                  const outerPct = total > 0 ? (m.outerKg / total) * 100 : 0;
                  return (
                    <div key={m.material}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate">
                          {materialLabel(m.material, i18n.language)}
                        </span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {total.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full flex rounded-full overflow-hidden"
                          initial={prefersReduced ? false : { width: 0 }}
                          animate={{ width: `${Math.max(widthPct, 2)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                          <div style={{ width: `${outerPct}%`, backgroundColor: OUTER_COLOR }} />
                          <div style={{ width: `${100 - outerPct}%`, backgroundColor: PRODUCT_COLOR }} />
                        </motion.div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Per packaging type */}
        <motion.div {...entrance}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{t('By packaging type')}</CardTitle>
              <CardDescription>
                {t('Shipments without an assigned carton count as 0 g outer packaging.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Packaging type')}</TableHead>
                    <TableHead className="text-right">{t('Shipments')}</TableHead>
                    <TableHead className="text-right">kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byPackagingType.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.kg.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {byPackagingType.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        {t('No data in range')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
