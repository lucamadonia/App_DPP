import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Package,
  FileWarning,
  AlertTriangle,
  FileX,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  QrCode,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Moon,
} from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComplianceReminderBanner } from '@/components/compliance/ComplianceReminderBanner';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';
import { ErrorState } from '@/components/ui/state-feedback';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useDocumentStats } from '@/hooks/queries';
import { useLocale } from '@/hooks/use-locale';
import { blurIn, gridStagger, gridItem, spring } from '@/lib/motion';
import { relativeTime, sparklinePoints } from '@/lib/animations';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ComplianceWidget } from '@/components/dashboard/ComplianceWidget';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { AiHintsWidget } from '@/components/dashboard/AiHintsWidget';

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

const SPARK_W = 120;
const SPARK_H = 36;

function Sparkline({ data }: { data: number[] }) {
  const points = sparklinePoints(data, SPARK_W, SPARK_H);
  if (!points) return null;
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className="h-8 w-full text-primary"
      aria-hidden
    >
      <polygon
        points={`2,${SPARK_H - 2} ${points} ${SPARK_W - 2},${SPARK_H - 2}`}
        fill="currentColor"
        opacity={0.12}
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const { data: docStats = { total: 0, valid: 0, expiring: 0, expired: 0 }, isLoading: docsLoading, isError: docsError, refetch: refetchDocs } = useDocumentStats();
  const isLoading = productsLoading || docsLoading;
  const isError = productsError || docsError;
  const prefersReduced = useReducedMotion();
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Captured once per mount via lazy initializer so render stays pure.
  const [now] = useState(() => new Date());

  const totalBatches = products.reduce((sum, p) => sum + (p.batchCount || 0), 0);
  const hour = now.getHours();
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const isNewUser = products.length === 0 && docStats.total === 0;
  const dateLine = now.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
      color: 'text-blue-500',
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

  const recentProducts = products.slice(0, 4);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        onRetry={() => { refetchProducts(); refetchDocs(); }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compliance reminder (EAR/LUCID monthly filings) */}
      <ComplianceReminderBanner />

      {/* Hero band — bold branded gradient, KPI cards overlap it */}
      <div>
        <motion.section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/75 p-5 pb-24 text-primary-foreground sm:p-7 sm:pb-28"
          variants={prefersReduced ? undefined : blurIn}
          initial={prefersReduced ? false : 'initial'}
          animate="animate"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary-foreground/15 blur-3xl" />
            <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
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

        {/* KPI grid — layered on top of the hero */}
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
                        <Sparkline data={weeklyCounts} />
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t('Last 8 weeks')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Onboarding CTA for new users */}
      {isNewUser && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <GlassCard enableGlow className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {t('Welcome to Trackbliss')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('Create your first Digital Product Passport in minutes. Add a product, upload documents, and generate QR codes.')}
                </p>
              </div>
              <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowOnboarding(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('Get Started')}
              </Button>
            </CardContent>
          </GlassCard>
        </motion.div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Bottom bento grid */}
      <motion.div
        className="grid gap-4 sm:gap-6 lg:grid-cols-3"
        variants={prefersReduced ? undefined : gridStagger}
        initial={prefersReduced ? false : 'initial'}
        animate="animate"
      >
        {/* Recent Products - spans 2 cols */}
        <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-2">
          <GlassCard className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    {t('Recent Products')}
                  </CardTitle>
                  <CardDescription className="hidden sm:block">
                    {t('Your most recently added products')}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0" asChild>
                  <Link to="/products">
                    {t('View All', { ns: 'common' })}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('No products yet')}
                  </p>
                  <Button className="mt-4" size="sm" asChild>
                    <Link to="/products/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('Create First Product')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <AnimatedList className="space-y-2.5">
                  {recentProducts.map((product) => (
                    <AnimatedListItem key={product.id} itemKey={product.id}>
                      <motion.div
                        whileHover={prefersReduced ? undefined : { x: 4 }}
                        transition={spring.snappy}
                      >
                        <Link
                          to={`/products/${product.id}`}
                          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt=""
                              loading="lazy"
                              className="h-10 w-10 shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 font-semibold text-primary">
                              {(product.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{product.name}</p>
                              {(() => {
                                // DB contains 'active' alongside the typed 'live' status.
                                const rawStatus = (product.status as string) || 'draft';
                                const isLive = rawStatus === 'live' || rawStatus === 'active';
                                return (
                                  <Badge
                                    variant={isLive ? 'default' : 'secondary'}
                                    className="shrink-0 text-xs"
                                  >
                                    {isLive && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                    {rawStatus === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                                    {t(rawStatus)}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              GTIN: {product.gtin} · {t('{{count}} Batches', { count: product.batchCount || 0 })}
                            </p>
                          </div>
                          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                            {product.createdAt
                              ? relativeTime(product.createdAt, locale)
                              : ''}
                          </span>
                        </Link>
                      </motion.div>
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              )}
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* Activity Feed - right column */}
        <motion.div variants={prefersReduced ? undefined : gridItem}>
          <ActivityFeed className="h-full" />
        </motion.div>

        {/* AI Hints Widget - spans 2 cols, above compliance */}
        <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-2">
          <AiHintsWidget className="h-full" />
        </motion.div>

        {/* Compliance Widget - spans 2 cols */}
        <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-2">
          <ComplianceWidget className="h-full" />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={prefersReduced ? undefined : gridItem}>
          <GlassCard className="h-full">
            <CardHeader>
              <CardTitle>{t('Quick Start')}</CardTitle>
              <CardDescription>
                {products.length === 0
                  ? t('Get started with DPP Manager')
                  : t('Frequently used features')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { to: '/products/new', icon: Package, label: t('Create Product'), color: 'text-primary', bg: 'bg-primary/10' },
                  { to: '/documents', icon: FileWarning, label: t('Documents', { ns: 'common' }), color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { to: '/dpp/qr-generator', icon: QrCode, label: t('Create QR Code'), color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                  { to: '/regulations', icon: TrendingUp, label: t('Regulations', { ns: 'common' }), color: 'text-amber-600', bg: 'bg-amber-500/10' },
                ].map((action) => (
                  <motion.div
                    key={action.to}
                    whileHover={prefersReduced ? undefined : { scale: 1.04, y: -2 }}
                    transition={spring.bouncy}
                  >
                    <Button variant="outline" className="group h-auto w-full flex-col gap-2 p-4" asChild>
                      <Link to={action.to}>
                        <span className={`rounded-lg p-2 ${action.bg}`}>
                          <action.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${action.color}`} />
                        </span>
                        <span className="text-xs">{action.label}</span>
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
