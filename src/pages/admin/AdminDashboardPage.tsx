/**
 * Admin Command-Center Dashboard
 *
 * Layout:
 *  - Row 1: Platform metrics (6 KPI cards)
 *  - Row 2: Attention Needed (3 lists: at-risk tenants, payment issues, recent audit)
 *  - Row 3: Plan distribution + Recent tenants with health gauges
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, Package, DollarSign,
  UserPlus, Sparkles, ArrowRight, AlertTriangle, Activity, ExternalLink,
  TrendingUp, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { TenantHealthGauge } from '@/components/admin/TenantHealthGauge';
import {
  getPlatformStats, listAdminTenants, listAuditLog,
} from '@/services/supabase/admin';
import { supabase } from '@/lib/supabase';
import type { PlatformStats, AdminTenant } from '@/types/admin';
import type { AdminAuditEntry } from '@/types/admin-extended';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enterprise: 'bg-violet-50 text-violet-700 border-violet-200',
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  const d = Math.floor(hr / 24);
  return `vor ${d} Tagen`;
}

interface TenantWithHealth extends AdminTenant {
  healthScore?: number;
  status?: string;
  suspendedReason?: string;
}

export function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [allTenants, setAllTenants] = useState<TenantWithHealth[]>([]);
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, tenantList, audit] = await Promise.all([
          getPlatformStats(),
          listAdminTenants(),
          listAuditLog({ limit: 10 }).catch(() => ({ entries: [], total: 0 })),
        ]);
        setStats(s);

        // Enrich tenants with health_score + status directly from DB (admin-only RLS ok)
        const ids = tenantList.map(t => t.id);
        const { data: healthRows } = ids.length
          ? await supabase.from('tenants').select('id, health_score, status, suspended_reason').in('id', ids)
          : { data: [] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const healthMap = new Map((healthRows || []).map((r: any) => [r.id, r]));
        const enriched = tenantList.map(t => {
          const h = healthMap.get(t.id);
          return {
            ...t,
            healthScore: h?.health_score ?? undefined,
            status: h?.status ?? 'active',
            suspendedReason: h?.suspended_reason ?? undefined,
          };
        });
        setAllTenants(enriched);
        setAuditEntries(audit.entries);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const atRisk = allTenants
    .filter(t => (t.healthScore ?? 100) < 60)
    .sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0))
    .slice(0, 5);

  const suspendedTenants = allTenants
    .filter(t => t.status && t.status !== 'active')
    .slice(0, 5);

  const topTenants = allTenants
    .slice()
    .sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0))
    .slice(0, 6);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('Platform Command Center')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('Kommandozentrale für alle Mandanten, Abos und Aktivitäten')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/audit-log">
              <Activity className="mr-1.5 h-4 w-4" />
              {t('Audit Log')}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/tenants">
              <Building2 className="mr-1.5 h-4 w-4" />
              {t('Alle Tenants')}
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI loading={loading} icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          label="MRR" value={fmtEuro(stats?.mrr ?? 0)} />
        <KPI loading={loading} icon={<Building2 className="h-4 w-4 text-blue-600" />}
          label={t('Tenants')} value={String(stats?.totalTenants ?? 0)}
          hint={`${stats?.paidTenants ?? 0} ${t('zahlen')}`} />
        <KPI loading={loading} icon={<Users className="h-4 w-4 text-violet-600" />}
          label={t('Users')} value={String(stats?.totalUsers ?? 0)} />
        <KPI loading={loading} icon={<UserPlus className="h-4 w-4 text-cyan-600" />}
          label={t('Neue (7T)')} value={String(stats?.recentSignups7d ?? 0)} />
        <KPI loading={loading} icon={<Package className="h-4 w-4 text-orange-600" />}
          label={t('Produkte')} value={String(stats?.totalProducts ?? 0)} />
        <KPI loading={loading} icon={<Sparkles className="h-4 w-4 text-amber-600" />}
          label={t('AI Credits / Monat')} value={String(stats?.aiCreditsUsedMonth ?? 0)} />
      </div>

      {/* Attention-Needed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* At-Risk */}
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('At-Risk Tenants')}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{atRisk.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}</div>
            ) : atRisk.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t('Alle Tenants gesund.')}
              </div>
            ) : (
              <ul className="divide-y">
                {atRisk.map(t => (
                  <li key={t.id}>
                    <Link to={`/admin/tenants/${t.id}`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors">
                      <TenantHealthGauge score={t.healthScore} size={36} strokeWidth={4} showLabel={false} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.plan} · {t.userCount} Users</div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Suspended / Payment Issues */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-red-600" />
              {t('Gesperrt / Problem')}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{suspendedTenants.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}</div>
            ) : suspendedTenants.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t('Keine gesperrten Tenants.')}
              </div>
            ) : (
              <ul className="divide-y">
                {suspendedTenants.map(t => (
                  <li key={t.id}>
                    <Link to={`/admin/tenants/${t.id}`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{t.name}</div>
                        <div className="text-[11px] text-red-700 truncate">{t.status} {t.suspendedReason && `· ${t.suspendedReason}`}</div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Admin Activity */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" />
              {t('Letzte Admin-Aktionen')}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" asChild>
              <Link to="/admin/audit-log">{t('Alle')} <ArrowRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}</div>
            ) : auditEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t('Noch keine Aktionen geloggt.')}
              </div>
            ) : (
              <ul className="divide-y">
                {auditEntries.slice(0, 5).map(e => (
                  <li key={e.id} className="px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] text-primary truncate">{e.action}</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          {e.targetLabel || e.targetId?.slice(0, 8) || '—'}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {relativeTime(e.createdAt)}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {e.adminEmail}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution + Top Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('Plan-Verteilung')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {(['free', 'pro', 'enterprise'] as const).map((plan) => {
              const count = stats?.planDistribution?.[plan] || 0;
              const total = stats?.totalTenants || 1;
              const pct = Math.round((count / total) * 100);
              const planColor = plan === 'enterprise' ? 'bg-violet-500'
                : plan === 'pro' ? 'bg-emerald-500'
                : 'bg-slate-400';
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium capitalize">{plan}</span>
                    <span className="text-muted-foreground tabular-nums">{count} <span className="opacity-60">· {pct}%</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${planColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t text-[11px] text-muted-foreground">
              <div>{t('Aktive Retouren')}: <span className="font-medium tabular-nums">{stats?.activeReturns ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Tenants Grid with Health */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              {t('Top Tenants (Health)')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-auto p-1 text-xs">
              <Link to="/admin/tenants">{t('Alle Tenants')} <ArrowRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <ShimmerSkeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {topTenants.map(t => (
                  <Link
                    key={t.id}
                    to={`/admin/tenants/${t.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <TenantHealthGauge score={t.healthScore} size={48} strokeWidth={5} showLabel={false} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{t.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className={`${PLAN_COLORS[t.plan] || ''} text-[10px] h-4 px-1.5`}>
                          {t.plan}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{t.userCount} Users</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(t.createdAt, locale)}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({
  icon, label, value, hint, loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tabular-nums mt-1 truncate">
          {loading ? '…' : value}
        </div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
      </CardContent>
    </Card>
  );
}
