import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  FileWarning,
  FileX,
  Moon,
  Package,
  Plus,
  QrCode,
  Sun,
  Sunrise,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/hooks/use-locale';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';
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

const heroReveal: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(10px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { ...spring.gentle, staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const heroItem: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(5px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: spring.gentle,
  },
};

/** The dashboard's cinematic command surface and first visual impression. */
export function DashboardHero({ products, docStats, isLoading, isNewUser }: DashboardHeroProps) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const prefersReduced = useReducedMotion();
  const [now] = useState(() => new Date());

  const hour = now.getHours();
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const dateLine = now.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalBatches = products.reduce((sum, product) => sum + (product.batchCount || 0), 0);
  const weeks = 8;
  const weeklyCounts = new Array<number>(weeks).fill(0);
  const nowMs = now.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  for (const product of products) {
    if (!product.createdAt) continue;
    const week = Math.floor((nowMs - new Date(product.createdAt).getTime()) / weekMs);
    if (week >= 0 && week < weeks) weeklyCounts[weeks - 1 - week] += 1;
  }

  const hasTrend = weeklyCounts.some((count) => count > 0);
  const stats = [
    {
      title: t('Active Products'),
      value: products.length,
      subtitle: products.length === 0
        ? t('No products yet')
        : t('{{count}} Batches', { count: totalBatches }),
      icon: Package,
      tone: 'primary',
      href: '/products',
      sparkline: hasTrend,
    },
    {
      title: t('Documents', { ns: 'common' }),
      value: docStats.total,
      subtitle: docStats.total === 0
        ? t('No documents yet')
        : t('{{count}} valid', { count: docStats.valid }),
      icon: FileWarning,
      tone: 'blue',
      href: '/documents',
    },
    {
      title: t('Expiring Certificates'),
      value: docStats.expiring,
      subtitle: t('next 30 days'),
      icon: AlertTriangle,
      tone: docStats.expiring > 0 ? 'warning' : 'neutral',
      href: '/documents',
    },
    {
      title: t('Expired Documents'),
      value: docStats.expired,
      subtitle: docStats.expired > 0 ? t('Action required') : t('All up to date'),
      icon: FileX,
      tone: docStats.expired > 0 ? 'danger' : 'success',
      href: '/documents',
    },
  ];

  return (
    <motion.section
      className="dashboard-hero-panel"
      variants={prefersReduced ? undefined : heroReveal}
      initial={prefersReduced ? false : 'initial'}
      animate="animate"
    >
      <div aria-hidden className="dashboard-hero-grid" />
      <div aria-hidden className="dashboard-hero-orb dashboard-hero-orb--one" />
      <div aria-hidden className="dashboard-hero-orb dashboard-hero-orb--two" />
      {!prefersReduced && <div aria-hidden className="dashboard-hero-scan" />}

      <motion.div
        aria-hidden
        className="dashboard-hero-visual"
        initial={prefersReduced ? false : { opacity: 0, x: 42, scale: 0.94 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ ...spring.gentle, delay: 0.2 }}
      >
        <img
          src="/images/dashboard/compliance-intelligence-hero.webp"
          alt=""
          width={960}
          height={640}
          decoding="async"
          fetchPriority="high"
        />
      </motion.div>

      <div className="relative z-10 p-5 sm:p-7 lg:p-8">
        <div className="flex min-h-[17rem] flex-col justify-between gap-7 lg:min-h-[19rem] lg:max-w-[58%]">
          <motion.div variants={prefersReduced ? undefined : heroItem} className="min-w-0">
            <div className="dashboard-hero-date">
              <span className="relative flex h-2 w-2">
                {!prefersReduced && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
              </span>
              <GreetingTimeIcon hour={hour} className="h-3.5 w-3.5" />
              {dateLine}
            </div>

            <h1 className="mt-4 max-w-4xl text-balance text-[clamp(2rem,4.2vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white">
              {displayName
                ? t(getGreetingKey(hour) + ', {{name}}!', { name: displayName })
                : t(getGreetingKey(hour) + '!')}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
              {isNewUser
                ? t('Get started by creating your first product')
                : t('Here is your overview for today')}
            </p>
          </motion.div>

          <motion.div
            variants={prefersReduced ? undefined : heroItem}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
          >
            <Button
              variant="ghost"
              className="dashboard-hero-action dashboard-hero-action--secondary group w-full sm:w-auto"
              asChild
            >
              <Link to="/dpp/qr-generator">
                <QrCode className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
                {t('Generate QR')}
              </Link>
            </Button>
            <Button className="dashboard-hero-action dashboard-hero-action--primary group w-full sm:w-auto" asChild>
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                {t('New Product')}
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          variants={prefersReduced ? undefined : heroItem}
          className="mt-7 grid overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-950/35 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:grid-cols-2 lg:mt-9 lg:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={prefersReduced ? undefined : heroItem}
              whileHover={prefersReduced ? undefined : { y: -5 }}
              transition={spring.snappy}
              className={cn(
                'dashboard-kpi-cell',
                index > 0 && 'sm:border-l sm:border-white/[0.08]',
                index === 2 && 'sm:border-l-0 lg:border-l',
              )}
            >
              <Link to={stat.href} className="group block h-full p-4 sm:p-5 lg:p-6">
                {isLoading ? (
                  <div className="animate-pulse space-y-3 py-1">
                    <div className="h-10 w-10 rounded-xl bg-white/10" />
                    <div className="h-9 w-16 rounded bg-white/10" />
                    <div className="h-3 w-24 rounded bg-white/10" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('dashboard-kpi-icon', `dashboard-kpi-icon--${stat.tone}`)}>
                        <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    <div className="mt-5 flex items-end gap-2">
                      <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-white sm:text-4xl">
                        <AnimatedCounter value={stat.value} />
                      </span>
                      <span className="mb-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_10px_rgba(103,232,249,0.6)] transition-transform duration-300 group-hover:scale-150" />
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-slate-100 sm:text-sm">{stat.title}</p>
                    <p className="truncate text-xs text-slate-400">{stat.subtitle}</p>
                    {stat.sparkline && (
                      <div className="mt-3 opacity-75 transition-opacity duration-300 group-hover:opacity-100">
                        <MiniTrendChart data={weeklyCounts} caption={t('Last 8 weeks')} />
                      </div>
                    )}
                  </>
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
