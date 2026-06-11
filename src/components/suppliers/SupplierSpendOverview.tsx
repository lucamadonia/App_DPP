import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
import type { SupplierSpendSummary } from '@/services/supabase';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

interface SupplierSpendOverviewProps {
  spendAnalysis: SupplierSpendSummary[];
}

/** Financial KPI cards + top-5 spend bar chart. Renders nothing when there is no spend data. */
export function SupplierSpendOverview({ spendAnalysis }: SupplierSpendOverviewProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  const kpis = useMemo(() => {
    if (spendAnalysis.length === 0) return null;
    const totalSpend = spendAnalysis.reduce((sum, s) => sum + s.totalSpend, 0);
    const totalBatches = spendAnalysis.reduce((sum, s) => sum + s.totalBatches, 0);
    const topSupplier = spendAnalysis[0]; // sorted desc by totalSpend
    return {
      totalSpend,
      topSupplier,
      avgOrderValue: totalBatches > 0 ? totalSpend / totalBatches : 0,
      currency: topSupplier?.currency || 'EUR',
      supplierCount: spendAnalysis.length,
    };
  }, [spendAnalysis]);

  const chartData = useMemo(() => spendAnalysis.slice(0, 5).map(s => ({
    name: s.supplierName.length > 15 ? s.supplierName.substring(0, 15) + '...' : s.supplierName,
    spend: s.totalSpend,
  })), [spendAnalysis]);

  if (!kpis || kpis.totalSpend <= 0) return null;

  return (
    <div className="space-y-4">
      <motion.div
        className="grid gap-3 sm:gap-4 md:grid-cols-3"
        variants={prefersReduced ? undefined : gridStagger}
        initial={prefersReduced ? undefined : 'initial'}
        animate={prefersReduced ? undefined : 'animate'}
      >
        <motion.div variants={prefersReduced ? undefined : gridItem}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">{t('Total Spend')}</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {formatCurrency(kpis.totalSpend, kpis.currency, locale)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('{{count}} suppliers', { count: kpis.supplierCount })}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={prefersReduced ? undefined : gridItem}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{t('Top Supplier')}</span>
              </div>
              <p className="mt-1 truncate text-lg font-bold text-blue-600">
                {kpis.topSupplier.supplierName}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {formatCurrency(kpis.topSupplier.totalSpend, kpis.currency, locale)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={prefersReduced ? undefined : gridItem}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">{t('Avg. Order Value')}</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
                {formatCurrency(kpis.avgOrderValue, kpis.currency, locale)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('Top Suppliers by Spend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v, kpis.currency, locale)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), kpis.currency, locale)} />
                <Bar dataKey="spend" radius={[0, 4, 4, 0]} isAnimationActive={!prefersReduced}>
                  {chartData.map((_entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
