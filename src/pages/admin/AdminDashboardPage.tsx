import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  Package,
  RotateCcw,
  CreditCard,
  DollarSign,
  UserPlus,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlatformStats, listAdminTenants } from '@/services/supabase/admin';
import type { PlatformStats, AdminTenant } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const KPI_CARDS: { key: keyof PlatformStats; icon: typeof Building2; color: string; prefix?: string }[] = [
  { key: 'totalTenants', icon: Building2, color: 'text-blue-600 bg-blue-100' },
  { key: 'totalUsers', icon: Users, color: 'text-violet-600 bg-violet-100' },
  { key: 'totalProducts', icon: Package, color: 'text-emerald-600 bg-emerald-100' },
  { key: 'activeReturns', icon: RotateCcw, color: 'text-orange-600 bg-orange-100' },
  { key: 'paidTenants', icon: CreditCard, color: 'text-pink-600 bg-pink-100' },
  { key: 'mrr', icon: DollarSign, color: 'text-green-600 bg-green-100', prefix: '\u20AC' },
  { key: 'recentSignups7d', icon: UserPlus, color: 'text-cyan-600 bg-cyan-100' },
  { key: 'aiCreditsUsedMonth', icon: Sparkles, color: 'text-amber-600 bg-amber-100' },
];

export function AdminDashboardPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [s, tenants] = await Promise.all([
          getPlatformStats(),
          listAdminTenants(),
        ]);
        setStats(s);
        setRecentTenants(tenants.slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const kpiLabels: Record<string, { label: string; sub?: string }> = {
    totalTenants: { label: t('Total Tenants') },
    totalUsers: { label: t('Total Users') },
    totalProducts: { label: t('Total Products') },
    activeReturns: { label: t('Active Returns') },
    paidTenants: { label: t('Paid Tenants') },
    mrr: { label: t('Monthly Revenue') },
    recentSignups7d: { label: t('Recent Signups'), sub: t('last 7 days') },
    aiCreditsUsedMonth: { label: t('AI Credits Used'), sub: t('this month') },
  };

  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    pro: 'bg-emerald-100 text-emerald-700',
    enterprise: 'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('Admin Portal')}</h1>
        <p className="text-muted-foreground">{t('Platform Overview')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(({ key, icon: Icon, color, prefix }) => {
          const rawValue = stats ? stats[key] : 0;
          const value = typeof rawValue === 'number' ? rawValue : 0;
          const meta = kpiLabels[key];
          return (
            <Card key={key} className={isLoading ? 'animate-pulse' : ''}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{meta.label}</p>
                    <p className="text-2xl font-bold tabular-nums mt-1">
                      {prefix}{typeof value === 'number' ? value.toLocaleString() : '0'}
                    </p>
                    {meta.sub && <p className="text-xs text-muted-foreground mt-0.5">{meta.sub}</p>}
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Plan Distribution')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['free', 'pro', 'enterprise'] as const).map((plan) => {
              const count = stats?.planDistribution[plan] || 0;
              const total = stats?.totalTenants || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{t(plan.charAt(0).toUpperCase() + plan.slice(1) as 'Free' | 'Pro' | 'Enterprise')}</span>
                    <span className="text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        plan === 'enterprise' ? 'bg-violet-500' : plan === 'pro' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('Recent Tenants')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/tenants">
                {t('View All')} <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  to={`/admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={planColors[tenant.plan] || ''} variant="secondary">
                      {tenant.plan}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(tenant.createdAt, locale)}
                    </span>
                  </div>
                </Link>
              ))}
              {recentTenants.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('No tenants found')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
