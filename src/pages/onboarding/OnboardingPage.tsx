import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Boxes,
  FileCheck,
  type LucideIcon,
  Package,
  QrCode,
  Rocket,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionBudget, type MotionBudget } from '@/hooks/use-motion-budget';
import { routeTransition, timing } from '@/lib/motion';
import { haptic } from '@/lib/haptics';
import { isNative } from '@/lib/platform';
import { markOnboardingCompleted } from './onboarding-state';
import { OnboardingIllustration } from './OnboardingIllustration';

interface SlideSpec {
  id: string;
  icon: LucideIcon;
  satellites: readonly [LucideIcon, LucideIcon];
  tint: string;
  /** English source string, also the i18n key (see CLAUDE.md i18n rules). */
  title: string;
  lines: readonly [string, string];
}

const SLIDES: readonly SlideSpec[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    satellites: [Package, QrCode],
    tint: 'from-sky-500/20 to-indigo-500/10',
    title: 'Welcome to Trackbliss',
    lines: [
      'Product passports, warehouse, returns and suppliers — all in one app.',
      'A short tour, then you are ready to go.',
    ],
  },
  {
    id: 'scan',
    icon: ScanLine,
    satellites: [Boxes, Package],
    tint: 'from-emerald-500/20 to-teal-500/10',
    title: 'Scan instead of typing',
    lines: [
      'Book stock in, pick orders and pack shipments straight from the barcode.',
      'Built for the warehouse floor, not the desk.',
    ],
  },
  {
    id: 'compliance',
    icon: QrCode,
    satellites: [ShieldCheck, FileCheck],
    tint: 'from-violet-500/20 to-fuchsia-500/10',
    title: 'Passports that hold up',
    lines: [
      'Digital product passports under EU ESPR — QR code, documents and supply chain included.',
      'The AI compliance check shows you what is still missing.',
    ],
  },
  {
    id: 'ready',
    icon: Rocket,
    satellites: [RotateCcw, Users],
    tint: 'from-amber-500/20 to-orange-500/10',
    title: 'You are all set',
    lines: [
      'Returns, support tickets and supplier data all live in the same account.',
      'You can replay this tour anytime under Help & Support.',
    ],
  },
];

const LAST = SLIDES.length - 1;

/**
 * First-run intro tour — a full-screen horizontal pager.
 *
 * Native only. The web build is a desktop admin tool that people reload all day
 * long; a takeover screen there is friction, not welcome. `OnboardingGate` is
 * what routes a first-run user here.
 *
 * It renders through a portal on `document.body` rather than inside the router
 * outlet: the outlet is wrapped in a transform-animating `PageTransition`, and
 * a transformed ancestor becomes the containing block for `position: fixed`,
 * which would pin this overlay to the page instead of the viewport mid-swipe.
 *
 * Only `transform` and `opacity` animate, so the pager stays on the compositor.
 */
export function OnboardingPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const budget = useMotionBudget();

  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  // `index` is also mirrored in a ref so the drag handler can read the current
  // page without being re-created (and re-attached) on every page change.
  const indexRef = useRef(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Measuring via a ref callback rather than an effect: the ResizeObserver
  // callback is what calls setState, which keeps this clear of the
  // react-hooks set-state-in-effect rule and needs no separate cleanup effect.
  const measureViewport = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setWidth(box.width);
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST, next));
    if (clamped === indexRef.current) return;
    indexRef.current = clamped;
    haptic.light();
    setIndex(clamped);
  }, []);

  const finish = useCallback(() => {
    haptic.success();
    void markOnboardingCompleted().finally(() => navigate('/', { replace: true }));
  }, [navigate]);

  const advance = useCallback(() => {
    if (indexRef.current >= LAST) finish();
    else goTo(indexRef.current + 1);
  }, [finish, goTo]);

  // Tapping the slide walks forward, but never *finishes* — leaving the tour
  // must stay a deliberate press on the CTA or on Skip.
  const handleTap = useCallback(() => {
    if (indexRef.current < LAST) goTo(indexRef.current + 1);
  }, [goTo]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // A short flick counts as much as a long drag — matching the platform
      // pagers people already have muscle memory for.
      const threshold = Math.max(48, width * 0.2);
      if (info.offset.x <= -threshold || info.velocity.x < -450) goTo(indexRef.current + 1);
      else if (info.offset.x >= threshold || info.velocity.x > 450) goTo(indexRef.current - 1);
    },
    [goTo, width]
  );

  // Nothing below this line depends on the guard, so the hooks above all run
  // unconditionally and the early return stays legal.
  if (!isNative()) return <Navigate to="/" replace />;

  const reduced = budget === 'reduced';
  const transition = routeTransition(budget);

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Onboarding')}
      className="fixed inset-0 z-[100] flex flex-col overscroll-contain bg-background text-foreground"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {/* Always escapable. */}
      <div className="flex shrink-0 justify-end px-2 py-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={finish}>
          {t('Skip')}
        </Button>
      </div>

      <div ref={measureViewport} className="relative min-h-0 flex-1 overflow-hidden">
        {reduced ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={SLIDES[index].id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: timing.fast, ease: 'easeOut' }}
            >
              <Slide slide={SLIDES[index]} active budget={budget} t={t} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            className="flex h-full w-full"
            drag="x"
            dragDirectionLock
            dragMomentum={false}
            dragElastic={0.12}
            dragConstraints={{ left: -LAST * width, right: 0 }}
            onDragEnd={handleDragEnd}
            onTap={handleTap}
            animate={{ x: -index * width }}
            transition={transition}
          >
            {SLIDES.map((slide, i) => (
              <div key={slide.id} className="h-full w-full shrink-0">
                <Slide slide={slide} active={i === index} budget={budget} t={t} />
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="shrink-0 space-y-4 px-6 pb-4 pt-2">
        <div className="flex items-center justify-center">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t('Go to screen {{number}}', { number: i + 1 })}
              aria-current={i === index ? 'step' : undefined}
              className="flex h-9 w-7 items-center justify-center"
            >
              {i === index ? (
                reduced ? (
                  <span className="h-1.5 w-5 rounded-full bg-primary" />
                ) : (
                  <motion.span
                    layoutId="onboarding-dot"
                    className="h-1.5 w-5 rounded-full bg-primary"
                    transition={transition}
                  />
                )
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </button>
          ))}
        </div>

        <Button className="h-12 w-full text-base" onClick={advance}>
          {index === LAST ? t('Get started') : t('Next')}
        </Button>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function Slide({
  slide,
  active,
  budget,
  t,
}: {
  slide: SlideSpec;
  active: boolean;
  budget: MotionBudget;
  t: (key: string) => string;
}) {
  return (
    <div className="flex h-full w-full select-none flex-col items-center justify-center gap-10 px-8 text-center">
      <div className="h-48 w-full shrink-0 sm:h-56">
        <OnboardingIllustration
          icon={slide.icon}
          satellites={slide.satellites}
          tint={slide.tint}
          active={active}
          budget={budget}
        />
      </div>
      <div className="max-w-md space-y-3">
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {t(slide.title)}
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">
          {t(slide.lines[0])}
        </p>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground/80">
          {t(slide.lines[1])}
        </p>
      </div>
    </div>
  );
}
