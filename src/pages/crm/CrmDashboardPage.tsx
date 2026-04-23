import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, Sparkles, Wallet, ArrowRight, RefreshCw, Heart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getTenantCRMKPIs,
  getTopCustomers,
  getAtRiskCustomers,
  refreshTenantRFMScores,
  type CrmKPIs,
  type CrmCustomer,
} from '@/services/supabase/crm-analytics';
import { toast } from 'sonner';

const SEGMENT_META: Record<string, { label: string; color: string }> = {
  champion:    { label: 'Champions',   color: '#a855f7' },
  loyal:       { label: 'Treue',        color: '#22c55e' },
  potential:   { label: 'Potenziale',  color: '#38bdf8' },
  new:         { label: 'Neulinge',    color: '#10b981' },
  at_risk:     { label: 'Gefährdet',   color: '#f59e0b' },
  hibernating: { label: 'Schlummernd', color: '#f97316' },
  lost:        { label: 'Verloren',    color: '#ef4444' },
  unassigned:  { label: 'Ohne Segment', color: '#94a3b8' },
};

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

export function CrmDashboardPage() {
  const { t } = useTranslation('warehouse');
  const [kpis, setKpis] = useState<CrmKPIs | null>(null);
  const [topCustomers, setTopCustomers] = useState<CrmCustomer[]>([]);
  const [atRisk, setAtRisk] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [k, tops, risks] = await Promise.all([
        getTenantCRMKPIs(),
        getTopCustomers(10),
        getAtRiskCustomers(10),
      ]);
      setKpis(k);
      setTopCustomers(tops);
      setAtRisk(risks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function handleRecompute() {
    setRefreshing(true);
    try {
      const n = await refreshTenantRFMScores();
      toast.success(t('{{count}} Kunden neu segmentiert', { count: n }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  const pieData = kpis ? Object.entries(kpis.segmentBreakdown).map(([key, value]) => ({
    name: SEGMENT_META[key]?.label || key,
    value,
    color: SEGMENT_META[key]?.color || '#94a3b8',
  })) : [];

  const histogramData = [
    { range: '0-50 €', min: 0, max: 50, count: 0 },
    { range: '50-200 €', min: 50, max: 200, count: 0 },
    { range: '200-500 €', min: 200, max: 500, count: 0 },
    { range: '500-1k €', min: 500, max: 1000, count: 0 },
    { range: '> 1k €', min: 1000, max: Infinity, count: 0 },
  ];
  topCustomers.concat(atRisk).forEach(c => {
    const bin = histogramData.find(b => c.totalSpent >= b.min && c.totalSpent < b.max);
    if (bin) bin.count++;
  });

  return (
    <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('CRM Dashboard')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('Kunden-360° · CLV · RFM-Segmentierung')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRecompute} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('Segmente neu berechnen')}
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          icon={<Users className="h-4 w-4" />}
          label={t('Kunden gesamt')}
          value={loading ? '…' : kpis?.totalCustomers.toLocaleString('de-DE') || '0'}
          hint={loading ? '' : `${kpis?.customersWithOrders || 0} ${t('mit Bestellungen')}`}
        />
        <KPICard
          icon={<Wallet className="h-4 w-4" />}
          label={t('Ø CLV')}
          value={loading ? '…' : fmtEuro(kpis?.avgCLV || 0)}
          hint={loading ? '' : `${t('Median')} ${fmtEuro(kpis?.medianCLV || 0)}`}
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('Gesamt-Revenue')}
          value={loading ? '…' : fmtEuro(kpis?.totalRevenue || 0)}
          hint=""
        />
        <KPICard
          icon={<Sparkles className="h-4 w-4 text-purple-600" />}
          label={t('VIPs')}
          value={loading ? '…' : String(kpis?.vipCount || 0)}
          hint={t('Champions')}
        />
        <KPICard
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          label={t('Gefährdet')}
          value={loading ? '…' : String(kpis?.atRiskCount || 0)}
          hint={loading ? '' : `${kpis?.newLast30d || 0} ${t('Neu · 30 Tage')}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('RFM-Segmente')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <ShimmerSkeleton className="h-[280px]" />
            ) : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                {t('Noch keine Daten')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `${val ?? 0} ${t('Kunden')}`}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('CLV-Verteilung')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <ShimmerSkeleton className="h-[280px]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val) => `${val ?? 0} ${t('Kunden')}`}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              {t('Top-Kunden nach CLV')}
            </CardTitle>
            <Link to="/crm/customers?sort=total_spent-desc" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('Alle')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2 px-0">
            {loading ? (
              <div className="px-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                {t('Noch keine Bestellungen')}
              </div>
            ) : (
              <ul className="divide-y">
                {topCustomers.map(c => (
                  <li key={c.id}>
                    <Link
                      to={`/crm/customers/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.totalOrders} {t('Bestellungen')} · {relativeDaysAgo(c.lastOrderAt)}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="font-semibold tabular-nums">{fmtEuro(c.totalSpent)}</div>
                        {c.rfmSegment && (
                          <Badge variant="outline" className="text-[10px] mt-0.5" style={{ borderColor: SEGMENT_META[c.rfmSegment]?.color, color: SEGMENT_META[c.rfmSegment]?.color }}>
                            {SEGMENT_META[c.rfmSegment]?.label}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('Risk-Alerts')}
            </CardTitle>
            <Link to="/crm/customers?segment=at_risk" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('Alle')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2 px-0">
            {loading ? (
              <div className="px-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}
              </div>
            ) : atRisk.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                {t('Keine gefährdeten Kunden. Super!')}
              </div>
            ) : (
              <ul className="divide-y">
                {atRisk.map(c => (
                  <li key={c.id}>
                    <Link
                      to={`/crm/customers/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('Zuletzt')} {relativeDaysAgo(c.lastOrderAt)} · CLV {fmtEuro(c.totalSpent)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-3"
                        style={{ borderColor: SEGMENT_META[c.rfmSegment || 'at_risk']?.color, color: SEGMENT_META[c.rfmSegment || 'at_risk']?.color }}
                      >
                        {SEGMENT_META[c.rfmSegment || 'at_risk']?.label}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  icon, label, value, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-3 sm:px-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tabular-nums truncate">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
      </CardContent>
    </Card>
  );
}
