import {
  BadgeCheck,
  Calculator,
  Compass,
  ListChecks,
  type LucideIcon,
  QrCode,
  Scale,
} from 'lucide-react';
import type { FirstRunAsset } from '@/components/first-run/lqip.generated';

export interface DiscoverNode {
  path: string;
  icon: LucideIcon;
  /** Card artwork. Typed against the generated union, so a renamed asset is a
   *  compile error rather than a silently broken tile. */
  image: FirstRunAsset;
  titleKey: string;
  descKey: string;
  /** Works with no connection at all once the app is installed. */
  offline: boolean;
}

/**
 * The guest surface, in one place.
 *
 * Deliberately NOT added to src/lib/nav-tree.ts: that drives the sidebar and
 * the More sheet for paying customers, and guest routes have no business there.
 */
export const DISCOVER_NODES: readonly DiscoverNode[] = [
  {
    path: '/discover/requirements',
    image: 'hub-requirements',
    icon: Calculator,
    titleKey: 'discover.tools.requirements.title',
    descKey: 'discover.tools.requirements.desc',
    offline: true,
  },
  {
    path: '/discover/checklists',
    image: 'hub-checklists',
    icon: ListChecks,
    titleKey: 'discover.tools.checklists.title',
    descKey: 'discover.tools.checklists.desc',
    offline: false,
  },
  {
    path: '/discover/qr',
    image: 'hub-qr',
    icon: QrCode,
    titleKey: 'discover.tools.qr.title',
    descKey: 'discover.tools.qr.desc',
    offline: true,
  },
  {
    path: '/discover/regulations',
    image: 'hub-regulations',
    icon: Scale,
    titleKey: 'discover.tools.regulations.title',
    descKey: 'discover.tools.regulations.desc',
    offline: false,
  },
  {
    path: '/discover/lexicon',
    image: 'hub-lexicon',
    icon: BadgeCheck,
    titleKey: 'discover.tools.lexicon.title',
    descKey: 'discover.tools.lexicon.desc',
    offline: true,
  },
  {
    path: '/discover/tips',
    image: 'hub-tips',
    icon: Compass,
    titleKey: 'discover.tools.tips.title',
    descKey: 'discover.tools.tips.desc',
    offline: true,
  },
];

/** Header titles. Kept here rather than in nav-tree for the same reason. */
export const DISCOVER_TITLES: Record<string, string> = {
  '/discover': 'discover.title',
  ...Object.fromEntries(DISCOVER_NODES.map((n) => [n.path, n.titleKey])),
};
