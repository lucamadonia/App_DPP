import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Package, RotateCcw, Warehouse, Lock, MoreHorizontal } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useBillingOptional } from '@/contexts/BillingContext';
import { MoreSheet } from '@/components/layout/more-sheet';
import type { NavModule } from '@/lib/nav-tree';

interface TabItem {
  to: string;
  /** Paths that also activate this tab (prefix match). */
  matchPaths: string[];
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  /** Billing capability that unlocks this tab, if any. */
  module?: NavModule;
}

/**
 * Fixed five-slot tab bar: four primary destinations plus "More".
 *
 * Deliberately NOT module-dependent. A tab bar that changes shape between
 * tenants destroys spatial memory — you learn "Returns is the fourth icon" and
 * that has to stay true. Tabs for modules the tenant has not booked stay
 * visible with a lock glyph and route to billing instead.
 *
 * Everything outside these four lives in the More sheet, which exposes the
 * complete tree. Before this, Commerce, CRM, Feedback, DPP, Documents and
 * Compliance had no route at all on a phone.
 */
const TABS: TabItem[] = [
  { to: '/', matchPaths: ['/'], icon: LayoutDashboard, labelKey: 'Start' },
  {
    to: '/warehouse',
    matchPaths: ['/warehouse'],
    icon: Warehouse,
    labelKey: 'Warehouse',
    module: 'warehouse',
  },
  { to: '/products', matchPaths: ['/products'], icon: Package, labelKey: 'Products' },
  {
    to: '/returns',
    matchPaths: ['/returns'],
    icon: RotateCcw,
    labelKey: 'Returns',
    module: 'returns',
  },
];

/** Route prefixes that render their own chrome and must not show the tab bar. */
const CHROME_FREE_PREFIXES = [
  '/p/',
  '/01/',
  '/t/',
  '/returns/portal/',
  '/returns/register/',
  '/returns/track',
  '/customer/',
  '/portal',
  '/suppliers/register/',
  '/suppliers/data/',
  '/embed/',
  '/widget/',
  '/transparency/',
  '/ideas/',
  '/widerruf/',
  '/login',
  '/landing',
  '/pricing',
  '/imprint',
  '/privacy',
  '/terms',
  '/auth/',
];

function isTabActive(pathname: string, tab: TabItem): boolean {
  return tab.matchPaths.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')
  );
}

/**
 * iOS-style bottom tab bar. Only renders below `md`.
 * z-30 sits under StickyBottomBar (z-40) so form actions stack on top.
 */
export function MobileBottomNav() {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion();
  const billing = useBillingOptional();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const isLocked = React.useCallback(
    (tab: TabItem): boolean => {
      if (!tab.module || !billing) return false;
      if (tab.module === 'warehouse') return !billing.hasAnyWarehouseModule();
      if (tab.module === 'returns') return !billing.hasAnyReturnsHubModule();
      return false;
    },
    [billing]
  );

  const hidden = CHROME_FREE_PREFIXES.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')
  );
  if (hidden) return null;

  const moreActive = !TABS.some((tab) => isTabActive(pathname, tab));

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 md:hidden',
          'border-t border-border bg-background/95 backdrop-blur-lg',
          'pb-[var(--safe-bottom)]'
        )}
        aria-label={t('Menu')}
      >
        <ul className="grid h-14 grid-cols-5">
          {TABS.map((tab) => {
            const active = isTabActive(pathname, tab);
            const locked = isLocked(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="relative">
                <Link
                  to={locked ? '/settings/billing' : tab.to}
                  onClick={() => haptic.light()}
                  className={cn(
                    'flex h-full touch-target flex-col items-center justify-center gap-0.5',
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                    locked && 'opacity-55'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {active &&
                    (prefersReduced ? (
                      <span className="absolute left-1/2 top-0 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
                    ) : (
                      <motion.span
                        layoutId="mobile-nav-active-indicator"
                        className="absolute left-1/2 top-0 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    ))}
                  <motion.span
                    animate={prefersReduced ? undefined : { scale: active ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="relative"
                  >
                    <Icon className="size-5" />
                    {locked && (
                      <Lock
                        className="absolute -right-1.5 -top-1 size-2.5 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </motion.span>
                  <span className="max-w-full truncate px-1">{t(tab.labelKey)}</span>
                </Link>
              </li>
            );
          })}

          <li className="relative">
            <button
              type="button"
              onClick={() => {
                haptic.light();
                setMoreOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'flex h-full w-full touch-target flex-col items-center justify-center gap-0.5',
                'text-[10px] font-medium transition-colors',
                moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {moreActive && !moreOpen && (
                <span className="absolute left-1/2 top-0 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
              )}
              <MoreHorizontal className="size-5" />
              <span className="max-w-full truncate px-1">{t('More')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
