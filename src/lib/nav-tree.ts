/**
 * The navigation tree of the app — one typed source of truth.
 *
 * Previously the same destinations were declared in several places (sidebar,
 * bottom nav, command palette), which is why the bottom nav only ever surfaced
 * 5 of the 16 top-level entries and Commerce, CRM, Feedback, DPP, Documents
 * and Compliance were unreachable on a phone.
 *
 * Titles are i18n KEYS, not strings: consumers call `t(titleKey, { ns })`.
 * Module gating is declarative via `module` and resolved by the consumer
 * against the billing context, so this file stays free of React.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Warehouse, Heart, Store, RotateCcw, MessageCircleHeart,
  Package, QrCode, FolderArchive, Megaphone, Handshake, ShieldCheck, Globe,
  BookOpen, Settings, Shield, HelpCircle,
} from 'lucide-react';

/** Which billing capability unlocks a branch. */
export type NavModule =
  | 'warehouse'
  | 'commerce'
  | 'returns'
  | 'feedback'
  | 'supplierPortal';

export interface NavLeaf {
  path: string;
  titleKey: string;
  /** i18n namespace for titleKey; defaults to 'common'. */
  ns?: string;
}

export interface NavNode {
  id: string;
  titleKey: string;
  ns?: string;
  icon: LucideIcon;
  /** Direct destination, for leaf-only entries such as Dashboard or Help. */
  path?: string;
  module?: NavModule;
  badgeKey?: string;
  children?: NavLeaf[];
}

export interface NavGroup {
  id: string;
  labelKey: string;
  ns?: string;
  nodes: NavNode[];
}

const W = 'warehouse';
const C = 'commerce';

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'start',
    labelKey: 'Start',
    nodes: [
      { id: 'dashboard', titleKey: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    id: 'daily',
    labelKey: 'Tagesgeschäft',
    nodes: [
      {
        id: 'warehouse',
        titleKey: 'Lager & Versand',
        icon: Warehouse,
        module: 'warehouse',
        children: [
          { path: '/warehouse', titleKey: 'Dashboard' },
          { path: '/warehouse/scanner', titleKey: 'Scanner', ns: W },
          { path: '/warehouse/inventory', titleKey: 'Inventory', ns: W },
          { path: '/warehouse/goods-receipt', titleKey: 'Goods Receipt', ns: W },
          { path: '/warehouse/outstanding-receipts', titleKey: 'Outstanding Goods Receipts', ns: W },
          { path: '/warehouse/stocktake', titleKey: 'Stocktake', ns: W },
          { path: '/warehouse/shipments', titleKey: 'Shipments', ns: W },
          { path: '/warehouse/shipping-rates', titleKey: 'Shipping Rates', ns: W },
          { path: '/warehouse/packaging-types', titleKey: 'Umverpackung', ns: W },
          { path: '/warehouse/transfers', titleKey: 'Transfers', ns: W },
          { path: '/warehouse/movements', titleKey: 'Bewegungen & Auswertung', ns: W },
          { path: '/warehouse/reports', titleKey: 'Reports & Analytics', ns: W },
          { path: '/warehouse/inventory-drift', titleKey: 'Inventory Drift', ns: W },
          { path: '/warehouse/locations', titleKey: 'Warehouse Locations', ns: W },
          { path: '/warehouse/contacts', titleKey: 'Contacts', ns: W },
          { path: '/warehouse/integrations', titleKey: 'Integrations', ns: W },
          { path: '/warehouse/ai', titleKey: 'AI Logistics Hub', ns: W },
          { path: '/warehouse/settings', titleKey: 'Settings' },
        ],
      },
      {
        id: 'crm',
        titleKey: 'CRM',
        icon: Heart,
        children: [
          { path: '/crm', titleKey: 'Dashboard' },
          { path: '/crm/customers', titleKey: 'Kundenliste', ns: W },
        ],
      },
      {
        id: 'commerce',
        titleKey: 'Commerce Hub',
        ns: C,
        icon: Store,
        module: 'commerce',
        badgeKey: 'NEU',
        children: [
          { path: '/commerce', titleKey: 'Channels', ns: C },
          { path: '/commerce/mega', titleKey: 'Mega Dashboard', ns: C },
          { path: '/commerce/orders', titleKey: 'All Orders', ns: C },
        ],
      },
      {
        id: 'returns',
        titleKey: 'Retouren & Support',
        icon: RotateCcw,
        module: 'returns',
        children: [
          { path: '/returns', titleKey: 'Dashboard' },
          { path: '/returns/list', titleKey: 'Returns' },
          { path: '/returns/tickets', titleKey: 'Tickets' },
          { path: '/returns/reports', titleKey: 'Reports' },
          { path: '/returns/workflows', titleKey: 'Workflows' },
          { path: '/returns/settings', titleKey: 'Settings' },
        ],
      },
      {
        id: 'feedback',
        titleKey: 'Feedback',
        icon: MessageCircleHeart,
        module: 'feedback',
        badgeKey: 'NEU',
        children: [
          { path: '/feedback/queue', titleKey: 'Queue' },
          { path: '/feedback/ideas', titleKey: 'Idea Board' },
          { path: '/feedback/invites', titleKey: 'Partner Invites' },
          { path: '/feedback/settings', titleKey: 'Settings' },
        ],
      },
    ],
  },
  {
    id: 'catalogue',
    labelKey: 'Sortiment',
    nodes: [
      {
        id: 'products',
        titleKey: 'Products',
        icon: Package,
        children: [
          { path: '/products', titleKey: 'All Products' },
          { path: '/products/new', titleKey: 'Create New' },
          { path: '/products/categories', titleKey: 'Categories' },
        ],
      },
      {
        id: 'dpp',
        titleKey: 'DPP / Passports',
        icon: QrCode,
        children: [
          { path: '/dpp', titleKey: 'Overview' },
          { path: '/dpp/qr-generator', titleKey: 'QR Generator' },
          { path: '/dpp/visibility', titleKey: 'Visibility' },
          { path: '/dpp/design', titleKey: 'Design' },
          { path: '/dpp/transparency', titleKey: 'Transparency Page' },
          { path: '/dpp/batch-upload', titleKey: 'Batch Upload' },
        ],
      },
      {
        id: 'documents',
        titleKey: 'Documents',
        icon: FolderArchive,
        children: [
          { path: '/documents', titleKey: 'All Documents' },
          { path: '/documents/upload', titleKey: 'Upload' },
          { path: '/documents/tracker', titleKey: 'Validity Tracker' },
        ],
      },
    ],
  },
  {
    id: 'partners',
    labelKey: 'Partner',
    nodes: [
      {
        id: 'influencer',
        titleKey: 'Influencer Hub',
        ns: W,
        icon: Megaphone,
        children: [
          { path: '/warehouse/influencer-hub', titleKey: 'Dashboard' },
          { path: '/warehouse/influencer-directory', titleKey: 'Influencer Directory', ns: W },
          { path: '/warehouse/campaigns', titleKey: 'Campaigns', ns: W },
          { path: '/warehouse/content-gallery', titleKey: 'Content Gallery', ns: W },
          { path: '/warehouse/samples', titleKey: 'Sample Tracking', ns: W },
          { path: '/warehouse/influencer-analytics', titleKey: 'Analytics', ns: W },
        ],
      },
      {
        id: 'suppliers',
        titleKey: 'Lieferanten',
        icon: Handshake,
        module: 'supplierPortal',
        children: [
          { path: '/suppliers', titleKey: 'Alle Lieferanten' },
          { path: '/supply-chain', titleKey: 'Lieferkette' },
        ],
      },
    ],
  },
  {
    id: 'compliance',
    labelKey: 'Compliance & Ressourcen',
    nodes: [
      {
        id: 'compliance',
        titleKey: 'Compliance',
        icon: ShieldCheck,
        children: [
          { path: '/compliance', titleKey: 'Audit Report' },
          { path: '/compliance/reports', titleKey: 'Monatsberichte' },
          { path: '/compliance/settings', titleKey: 'Compliance Settings' },
          { path: '/compliance/audit', titleKey: 'Audit-Trail' },
          { path: '/compliance/export', titleKey: 'Export' },
          { path: '/compliance/audit-log', titleKey: 'Audit Log' },
        ],
      },
      {
        id: 'regulations',
        titleKey: 'Regulations',
        icon: Globe,
        children: [
          { path: '/regulations/countries', titleKey: 'Countries' },
          { path: '/regulations/eu', titleKey: 'EU Regulations' },
          { path: '/pictograms', titleKey: 'Pictograms' },
        ],
      },
      {
        id: 'knowledge',
        titleKey: 'Wissen',
        icon: BookOpen,
        children: [
          { path: '/checklists', titleKey: 'Checklists' },
          { path: '/market-entry', titleKey: 'Market Entry', ns: 'compliance' },
          { path: '/requirements-calculator', titleKey: 'Requirements Calculator' },
          { path: '/news', titleKey: 'News' },
        ],
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'System',
    nodes: [
      {
        id: 'settings',
        titleKey: 'Settings',
        icon: Settings,
        children: [
          { path: '/settings/company', titleKey: 'Company Profile' },
          { path: '/settings/branding', titleKey: 'Branding' },
          { path: '/settings/users', titleKey: 'Users & Roles' },
          { path: '/settings/api-keys', titleKey: 'API Keys' },
          { path: '/settings/billing', titleKey: 'Billing' },
          { path: '/settings/activity-log', titleKey: 'Activity Log' },
        ],
      },
      { id: 'help', titleKey: 'Help & Support', icon: HelpCircle, path: '/help' },
    ],
  },
];

/** Super-admin only; kept separate so it never leaks into the tenant tree. */
export const ADMIN_NODE: NavNode = {
  id: 'admin',
  titleKey: 'Admin',
  icon: Shield,
  children: [
    { path: '/admin', titleKey: 'Dashboard' },
    { path: '/admin/tenants', titleKey: 'Tenants' },
    { path: '/admin/users', titleKey: 'Users' },
    { path: '/admin/billing', titleKey: 'Billing' },
    { path: '/admin/credits', titleKey: 'Credits' },
    { path: '/admin/coupons', titleKey: 'Coupons' },
    { path: '/admin/master-data', titleKey: 'Master Data' },
  ],
};

/** Every destination in the tree, flattened — used by route-coverage checks. */
export function allNavPaths(): string[] {
  const out: string[] = [];
  for (const group of NAV_GROUPS) {
    for (const node of group.nodes) {
      if (node.path) out.push(node.path);
      node.children?.forEach((c) => out.push(c.path));
    }
  }
  ADMIN_NODE.children?.forEach((c) => out.push(c.path));
  return out;
}

/** The node a pathname belongs to, or undefined. Longest match wins. */
export function findNodeForPath(pathname: string): NavNode | undefined {
  let best: NavNode | undefined;
  let bestLen = -1;
  for (const group of NAV_GROUPS) {
    for (const node of [...group.nodes, ADMIN_NODE]) {
      const candidates = [node.path, ...(node.children?.map((c) => c.path) ?? [])].filter(
        Boolean
      ) as string[];
      for (const p of candidates) {
        const matches =
          p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/');
        if (matches && p.length > bestLen) {
          best = node;
          bestLen = p.length;
        }
      }
    }
  }
  return best;
}
