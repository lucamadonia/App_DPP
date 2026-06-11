import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Package,
  FileWarning,
  AlertTriangle,
  FileX,
  ArrowUpRight,
  QrCode,
  Plus,
  Sun,
  Sunrise,
  Moon,
} from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/hooks/use-locale';
import { blurIn, gridStagger, gridItem } from '@/lib/motion';
import { MiniTrendChart } from './MiniTrendChart';
import type { ProductListItem } from '@/services/supabase/products';

function getGreetingKey(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function GreetingTimeIcon({ hour, className }: { hour: number; className?: string }) {
  if (hour < 6) return <Moon className={className} />;
  if (hour < 12) return <Sunrise className={className} />;
  if (hour < 18) return <Sun className={className} />;
  return <Moon className={className} />;
}

interface DocStats {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
}

interface DashboardHeroProps {
  products: ProductListItem[];
  docStats: DocStats;
  isLoading: boolean;
  isNewUser: boolean;
}

/** Branded gradient hero band with the four core KPI cards layered on top. */
export function DashboardHero({ products, docStats, isLoading, isNewUser }: DashboardHeroProps) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const prefersReduced = useReducedMotion();
  // Captured once per mount via lazy initializer so render stays pure.
  const [now] = useState(() => new Date());

  const hour = now.getHours();
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const dateLine = now.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalBatches = products.reduce((sum, p) => sum + (p.batchCount || 0), 0);

  // Products created per week over the last 8 weeks (oldest → newest).
  const weeks = 8;
  const weeklyCounts = new Array<number>(weeks).fill(0);
  const nowMs = now.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const p of products) {
    if (!p.createdAt) continue;
    const w = Math.floor((nowMs - new Date(p.createdAt).getTime()) / weekMs);
    if (w >= 0 && w < weeks) weeklyCounts[weeks - 1 - w] += 1;
  }
  const hasTrend = weeklyCounts.some((c) => c > 0);

  const stats = [
    {
      title: t('Active Products'),
      value: products.length,
      subtitle: products.length === 0
        ? t('No products yet')
        : t('{{count}} Batches', { count: totalBatches }),
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/products',
      sparkline: hasTrend,
    },
    {
      title: t('Documents', { ns: 'common' }),
      value: docStats.total,
      subtitle: docStats.total === 0 ? t('No documents yet') : t('{{count}} valid', { count: docStats.valid }),
      icon: FileWarning,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      href: '/documents',
    },
    {
      title: t('Expiring Certificates'),
      value: docStats.expiring,
      subtitle: t('next 30 days'),
      icon: AlertTriangle,
      color: docStats.expiring > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: docStats.expiring > 0 ? 'bg-warning/10' : 'bg-muted/50',
      href: '/documents',
    },
    {
      title: t('Expired Documents'),
      value: docStats.expired,
      subtitle: docStats.expired > 0 ? t('Action required') : t('All up to date'),
      icon: FileX,
      color: docStats.expired > 0 ? 'text-destructive' : 'text-success',
      bgColor: docStats.expired > 0 ? 'bg-destructive/10' : 'bg-success/10',
      href: '/documents',
    },
  ];

  return (
    <div>
      <motion.section
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-5 pb-24 text-primary-foreground sm:p-7 sm:pb-28"
        variants={prefersReduced ? undefined : blurIn}
        initial={prefersReduced ? false : 'initial'}
        animate="animate"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary-foreground/15 blur-3xl" />
          <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-black/25 blur-3xl" />
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground/75">
              <GreetingTimeIcon hour={hour} className="h-3.5 w-3.5" />
              {dateLine}
            </p>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-4xl">
              {displayName
                ? t(getGreetingKey(hour) + ', {{name}}!', { name: displayName })
                : t(getGreetingKey(hour) + '!')}
            </h1>
            <p className="mt-1.5 text-sm text-primary-foreground/80 sm:text-base">
              {isNewUser
                ? t('Get started by creating your first product')
                : t('Here is your overview for today')}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              variant="ghost"
              className="w-full border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground sm:w-auto"
              asChild
            >
              <Link to="/dpp/qr-generator">
                <QrCode className="mr-2 h-4 w-4" />
                {t('Generate QR')}
              </Link>
            </Button>
            <Button
              className="w-full bg-primary-foreground text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto"
              asChild
            >
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('New Product')}
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Core KPI cards — layered on top of the hero */}
      <motion.div
        className="relative z-10 -mt-16 grid grid-cols-2 gap-3 px-3 sm:-mt-20 sm:gap-4 sm:px-5 lg:grid-cols-4"
        variants={prefersReduced ? undefined : gridStagger}
        initial={prefersReduced ? false : 'initial'}
        animate="animate"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={prefersReduced ? undefined : gridItem}>
            <Link to={stat.href} className="group block h-full">
              <GlassCard
                enableTilt={!prefersReduced}
                className="h-full shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <CardContent className="flex h-full flex-col p-4 sm:p-5">
                  {isLoading ? (
                    <div className="animate-pulse space-y-3 py-1">
                      <div className="h-9 w-9 rounded-xl bg-muted" />
                      <div className="h-8 w-16 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className={`rounded-xl p-2 sm:p-2.5 ${stat.bgColor}`}>
                          <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <p className="mt-0.5 truncate text-xs font-medium text-foreground sm:text-sm">
                        {stat.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{stat.subtitle}</p>
                      {stat.sparkline && (
                        <div className="mt-auto pt-3">
                          <MiniTrendChart data={weeklyCounts} caption={t('Last 8 weeks')} />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
