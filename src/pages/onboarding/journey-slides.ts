/**
 * The seven intro slides, in narrative order.
 *
 * The arc: what you make -> how you work -> what makes it hard -> where money
 * leaks -> who else is involved -> what your customer sees -> what you know.
 * The welcome is folded into slide 1 rather than spending a whole slide on a
 * greeting.
 *
 * Every slide carries COMPLETE illustration data (icon, satellites, tint) as
 * well as a photo. That is not belt-and-braces: under `budget === 'minimal'`
 * the illustration is the primary path, and it is also what renders when a
 * backdrop fails to decode. It must never be a stub.
 */
import {
  BarChart3,
  Boxes,
  FileCheck,
  Globe,
  type LucideIcon,
  Package,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import type { FirstRunAsset } from '@/components/first-run/lqip.generated';

export interface JourneySlideSpec {
  id: string;
  /** Backdrop slug. Typed against the generated union, so a renamed or
   *  misspelled asset is a compile error rather than a blank first screen. */
  image: FirstRunAsset;
  /** Centre-disc icon for the illustration fallback. */
  icon: LucideIcon;
  /** Two corner icons for the illustration fallback. */
  satellites: readonly [LucideIcon, LucideIcon];
  /** Tailwind gradient stops for the illustration panel. */
  tint: string;
  /** Nested dotted keys in the `journey` namespace. */
  titleKey: string;
  lineKeys: readonly [string, string];
  /** Small credibility chip. Only ever a number we can actually defend. */
  proofKey: string;
}

export const JOURNEY_SLIDES: readonly JourneySlideSpec[] = [
  {
    id: 'passport',
    image: 'journey-passport',
    icon: QrCode,
    satellites: [Package, ShieldCheck],
    tint: 'from-sky-500/20 to-indigo-500/10',
    titleKey: 'journey.slides.passport.title',
    lineKeys: ['journey.slides.passport.line1', 'journey.slides.passport.line2'],
    proofKey: 'journey.slides.passport.proof',
  },
  {
    id: 'scan',
    image: 'journey-scan',
    icon: ScanLine,
    satellites: [Boxes, Warehouse],
    tint: 'from-emerald-500/20 to-teal-500/10',
    titleKey: 'journey.slides.scan.title',
    lineKeys: ['journey.slides.scan.line1', 'journey.slides.scan.line2'],
    proofKey: 'journey.slides.scan.proof',
  },
  {
    id: 'compliance',
    image: 'journey-compliance',
    icon: Sparkles,
    satellites: [ShieldCheck, FileCheck],
    tint: 'from-violet-500/20 to-fuchsia-500/10',
    titleKey: 'journey.slides.compliance.title',
    lineKeys: ['journey.slides.compliance.line1', 'journey.slides.compliance.line2'],
    proofKey: 'journey.slides.compliance.proof',
  },
  {
    id: 'returns',
    image: 'journey-returns',
    icon: RotateCcw,
    satellites: [Package, FileCheck],
    tint: 'from-amber-500/20 to-orange-500/10',
    titleKey: 'journey.slides.returns.title',
    lineKeys: ['journey.slides.returns.line1', 'journey.slides.returns.line2'],
    proofKey: 'journey.slides.returns.proof',
  },
  {
    id: 'suppliers',
    image: 'journey-suppliers',
    icon: Truck,
    satellites: [Users, Globe],
    tint: 'from-cyan-500/20 to-blue-500/10',
    titleKey: 'journey.slides.suppliers.title',
    lineKeys: ['journey.slides.suppliers.line1', 'journey.slides.suppliers.line2'],
    proofKey: 'journey.slides.suppliers.proof',
  },
  {
    id: 'portal',
    image: 'journey-portal',
    icon: Smartphone,
    satellites: [Globe, QrCode],
    tint: 'from-rose-500/20 to-pink-500/10',
    titleKey: 'journey.slides.portal.title',
    lineKeys: ['journey.slides.portal.line1', 'journey.slides.portal.line2'],
    proofKey: 'journey.slides.portal.proof',
  },
  {
    id: 'insight',
    image: 'journey-insight',
    icon: BarChart3,
    satellites: [Boxes, ShieldCheck],
    tint: 'from-indigo-500/20 to-sky-500/10',
    titleKey: 'journey.slides.insight.title',
    lineKeys: ['journey.slides.insight.line1', 'journey.slides.insight.line2'],
    proofKey: 'journey.slides.insight.proof',
  },
] as const;

/**
 * Index of the finish slide — it lives inside the pager rather than on its own
 * route, so back-from-finish is just a right swipe and the drag physics never
 * die mid-gesture.
 */
export const JOURNEY_LAST = JOURNEY_SLIDES.length;

/** Total panels in the track: seven slides plus the finish. */
export const JOURNEY_PANELS = JOURNEY_SLIDES.length + 1;
