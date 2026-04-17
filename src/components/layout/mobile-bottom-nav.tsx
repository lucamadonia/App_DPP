import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Package, RotateCcw, Ticket, Settings } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  /** Paths that also activate this item (prefix match) */
  matchPaths: string[];
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  /** Optional badge count source key (future: integrate with useBilling/quota) */
  badge?: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    matchPaths: ['/dashboard', '/'],
    icon: LayoutDashboard,
    labelKey: 'Dashboard',
  },
  {
    to: '/products',
    matchPaths: ['/products'],
    icon: Package,
    labelKey: 'Products',
  },
  {
    to: '/returns',
    matchPaths: ['/returns'],
    icon: RotateCcw,
    labelKey: 'Returns',
  },
  {
    to: '/returns/tickets',
    matchPaths: ['/returns/tickets'],
    icon: Ticket,
    labelKey: 'Tickets',
  },
  {
    to: '/settings/company',
    matchPaths: ['/settings'],
    icon: Settings,
    labelKey: 'Settings',
  },
];

function isPathActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.to) return true;
  // Exact match root
  if (item.to === '/' && pathname === '/') return true;
  return item.matchPaths.some((p) => {
    if (p === '/') return pathname === '/';
    return pathname === p || pathname.startsWith(p + '/');
  });
}

/**
 * iOS-style mobile bottom navigation.
 * Only renders on `<md` (hidden on tablets + desktop).
 * Respects safe-area-inset-bottom for iOS notched devices.
 * z-30 sits below StickyBottomBar (z-40) so form actions stack on top.
 */
export function MobileBottomNav() {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion();

  // Only show on actual mobile app shell paths — not on public/portal routes
  const isPublicRoute =
    pathname.startsWith('/p/') ||
    pathname.startsWith('/01/') ||
    pathname.startsWith('/returns/portal/') ||
    pathname.startsWith('/returns/register/') ||
    pathname.startsWith('/returns/track') ||
    pathname.startsWith('/customer/') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/suppliers/register/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/auth/');

  if (isPublicRoute) return null;

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 md:hidden',
        'border-t border-border bg-background/95 backdrop-blur-lg',
        'pb-[env(safe-area-inset-bottom)]'
      )}
      aria-label={t('Menu')}
    >
      <ul className="grid grid-cols-5 h-14">
        {NAV_ITEMS.map((item) => {
          const active = isPathActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.to} className="relative">
              <Link
                to={item.to}
                className={cn(
                  'flex flex-col items-center justify-center h-full gap-0.5 text-[10px] font-medium transition-colors touch-target',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && !prefersReduced && (
                  <motion.span
                    layoutId="mobile-nav-active-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                {active && prefersReduced && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-primary" />
                )}
                <Icon className="size-5" />
                <span className="truncate max-w-full px-1">
                  {t(item.labelKey)}
                </span>
                {item.badge && (
                  <span className="absolute top-1.5 right-[calc(50%-14px)] flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
