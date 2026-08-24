import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Lock, Search, X } from 'lucide-react';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { NAV_GROUPS, ADMIN_NODE, type NavGroup, type NavLeaf, type NavNode } from '@/lib/nav-tree';
import { useBillingOptional } from '@/hooks/use-billing';
import { useAuth } from '@/contexts/AuthContext';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Nodes the bottom tab bar already covers — no point repeating them here. */
const PRIMARY_NODE_IDS = new Set(['dashboard', 'warehouse', 'products', 'returns']);

/**
 * The full navigation tree in a bottom sheet.
 *
 * This is what makes every destination reachable on a phone: the tab bar has
 * four primary slots, and everything else — Commerce, CRM, Feedback, DPP,
 * Documents, Compliance, Regulations, Wissen, Settings, Admin — lives here.
 */
export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const billing = useBillingOptional();
  const { isSuperAdmin } = useAuth();
  const [query, setQuery] = useState('');

  const isLocked = (node: NavNode): boolean => {
    if (!node.module || !billing) return false;
    switch (node.module) {
      case 'warehouse':
        return !billing.hasAnyWarehouseModule();
      case 'commerce':
        return !billing.hasAnyCommerceHubModule();
      case 'returns':
        return !billing.hasAnyReturnsHubModule();
      case 'feedback':
        return !billing.hasAnyFeedbackModule();
      case 'supplierPortal':
        return !billing.hasModule('supplier_portal') && billing.entitlements?.plan === 'free';
      default:
        return false;
    }
  };

  const label = (key: string, ns?: string) => (ns ? t(key, { ns }) : t(key));

  const groups = useMemo<NavGroup[]>(() => {
    const withAdmin = NAV_GROUPS.map((g) =>
      g.id === 'system' && isSuperAdmin ? { ...g, nodes: [...g.nodes, ADMIN_NODE] } : g
    );
    const q = query.trim().toLowerCase();

    if (!q) {
      // Without a query, hide the nodes the tab bar already shows.
      return withAdmin
        .map((g) => ({ ...g, nodes: g.nodes.filter((n) => !PRIMARY_NODE_IDS.has(n.id)) }))
        .filter((g) => g.nodes.length > 0);
    }

    const hit = (key: string, ns?: string) => label(key, ns).toLowerCase().includes(q);
    return withAdmin
      .map((g) => ({
        ...g,
        nodes: g.nodes
          .map((n) => {
            if (hit(n.titleKey, n.ns)) return n;
            const kids = n.children?.filter((c) => hit(c.titleKey, c.ns));
            return kids?.length ? { ...n, children: kids } : null;
          })
          .filter((n): n is NavNode => n !== null),
      }))
      .filter((g) => g.nodes.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isSuperAdmin, t]);

  const close = () => {
    setQuery('');
    onOpenChange(false);
  };

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');

  const renderLeaf = (leaf: NavLeaf, locked: boolean) => {
    const active = isActive(leaf.path);
    return (
      <Link
        key={leaf.path}
        to={locked ? '/settings/billing' : leaf.path}
        onClick={() => {
          haptic.light();
          close();
        }}
        className={cn(
          'flex touch-target items-center justify-between gap-3 rounded-lg px-3 py-2.5',
          'text-sm transition-colors active:bg-accent',
          active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <span className="truncate">{label(leaf.titleKey, leaf.ns)}</span>
        {locked ? (
          <Lock className="size-3.5 shrink-0 opacity-60" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 opacity-40" aria-hidden />
        )}
      </Link>
    );
  };

  const renderNode = (node: NavNode) => {
    const locked = isLocked(node);
    const Icon = node.icon;
    return (
      <div key={node.id} className="space-y-0.5">
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <Icon className={cn('size-4 shrink-0', locked && 'opacity-50')} aria-hidden />
          <span className={cn('text-sm font-semibold', locked && 'opacity-60')}>
            {label(node.titleKey, node.ns)}
          </span>
          {node.badgeKey && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {node.badgeKey}
            </Badge>
          )}
          {locked && <Lock className="size-3 opacity-60" aria-hidden />}
        </div>
        {node.path && !node.children ? (
          renderLeaf({ path: node.path, titleKey: node.titleKey, ns: node.ns }, locked)
        ) : (
          <div className="pl-6">{node.children?.map((c) => renderLeaf(c, locked))}</div>
        )}
      </div>
    );
  };

  return (
    <MobileDrawer
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(true) : close())}
      side="bottom"
      title={t('All areas')}
      description={t('Every section of the app')}
      maxHeight="88vh"
      showCloseButton={false}
    >
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-50" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search navigation')}
          className="pl-9 pr-9"
          aria-label={t('Search navigation')}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-60"
            aria-label={t('Clear')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('No results')}</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="mb-2">
            <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {label(group.labelKey, group.ns)}
            </p>
            {group.nodes.map(renderNode)}
          </div>
        ))
      )}
    </MobileDrawer>
  );
}
