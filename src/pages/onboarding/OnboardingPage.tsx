import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { timing } from '@/lib/motion';
import { haptic } from '@/lib/haptics';
import { showsFirstRun } from '@/lib/platform';
import { isOnboardingCompleted, markOnboardingCompleted } from './onboarding-state';
import { JOURNEY_LAST, JOURNEY_PANELS, JOURNEY_SLIDES } from './journey-slides';
import { JourneyFinish } from './JourneyFinish';
import { JourneyProgress } from './JourneyProgress';
import { JourneySlide } from './JourneySlide';
import { useJourneyImages } from './use-journey-images';
import { useJourneyPager } from './use-journey-pager';

/**
 * Three states, because the Preferences read is async and a spinner right after
 * a 550 ms splash is a boot regression you can see. While checking we paint the
 * stage gradient, which is indistinguishable from the journey's own ground.
 */
type Phase = 'checking' | 'show' | 'skip';

/**
 * First-run intro journey — a full-screen horizontal pager over seven photo
 * slides plus a finish panel.
 *
 * Native only in every shipping build. The web build is a desktop admin tool
 * people reload all day; a takeover screen there is friction, not welcome.
 * `showsFirstRun()` rather than `isNative()` so the CI Playwright build can
 * compile these routes in and measure them — see src/lib/platform.ts.
 *
 * Rendered through a portal on document.body rather than inside the router
 * outlet: the outlet is wrapped in a transform-animating PageTransition, and a
 * transformed ancestor becomes the containing block for `position: fixed`,
 * which would pin this overlay to the page instead of the viewport mid-swipe.
 *
 * Only transform and opacity animate, so the pager stays on the compositor.
 */
export function OnboardingPage() {
  const { t } = useTranslation(['journey', 'common']);
  const navigate = useNavigate();
  const budget = useMotionBudget();
  const [phase, setPhase] = useState<Phase>('checking');

  // Leaving the journey by ANY of the three doors must mark it complete.
  // Without this, someone who signs up straight after the tour is thrown
  // immediately into a second one by OnboardingGate. Conversely, abandoning it
  // (backgrounding the app) leaves the flag unset, so the tour is offered again
  // after login — which is the right behaviour.
  const leave = useCallback(
    (target: string) => {
      haptic.success();
      void markOnboardingCompleted().finally(() => navigate(target, { replace: true }));
    },
    [navigate]
  );

  const pager = useJourneyPager({
    last: JOURNEY_LAST,
    budget,
    onFinish: () => leave('/login?mode=signup'),
  });
  const { index, width, x, measureViewport, goTo, advance, handleDragEnd, handleTap } = pager;
  const imageState = useJourneyImages(index, budget);

  useEffect(() => {
    if (!showsFirstRun()) return;
    let cancelled = false;
    void isOnboardingCompleted().then((done) => {
      if (!cancelled) setPhase(done ? 'skip' : 'show');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every hook above runs unconditionally, so these early returns stay legal.
  if (!showsFirstRun()) return <Navigate to="/" replace />;
  // The Preferences read fails *closed* (returns "already completed"), so a
  // storage error sends a guest to /login — the safe direction.
  if (phase === 'skip') return <Navigate to="/login" replace />;

  const reduced = budget === 'reduced';
  const onFinishPanel = index === JOURNEY_LAST;

  const panels = [
    ...JOURNEY_SLIDES.map((slide, i) => (
      <JourneySlide
        key={slide.id}
        slide={slide}
        indexInTrack={i}
        x={x}
        width={width}
        active={i === index}
        budget={budget}
        imageState={imageState(slide.image)}
        t={t}
      />
    )),
    <JourneyFinish
      key="finish"
      budget={budget}
      active={onFinishPanel}
      t={t}
      onCreateAccount={() => leave('/login?mode=signup')}
      onExplore={() => leave('/discover')}
      onSignIn={() => leave('/login')}
    />,
  ];

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('journey.a11y.label')}
      className="journey-stage fixed inset-0 z-[100] flex flex-col overscroll-contain"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {phase !== 'checking' && (
        <>
          {/* Skip jumps to the finish panel rather than out of the tour. The
              finish IS the conversion moment; skipping past it would throw away
              the entire point of running a tour. */}
          <div className="flex shrink-0 justify-end px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white"
              onClick={() => goTo(JOURNEY_LAST)}
              disabled={onFinishPanel}
            >
              {t('journey.skip')}
            </Button>
          </div>

          <div ref={measureViewport} className="relative min-h-0 flex-1 overflow-hidden">
            {reduced ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: timing.fast, ease: 'easeOut' }}
                >
                  {panels[index]}
                </motion.div>
              </AnimatePresence>
            ) : (
              <motion.div
                className="flex h-full w-full"
                style={{ x }}
                drag="x"
                dragDirectionLock
                dragMomentum={false}
                dragElastic={0.12}
                dragConstraints={{ left: -JOURNEY_LAST * width, right: 0 }}
                onDragEnd={handleDragEnd}
                onTap={handleTap}
              >
                {panels.map((panel, i) => (
                  <div key={i} className="h-full w-full shrink-0">
                    {panel}
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="shrink-0 px-7 pb-3">
            <JourneyProgress
              count={JOURNEY_PANELS}
              index={index}
              x={x}
              width={width}
              budget={budget}
              onSelect={goTo}
              label={(n) => t('journey.progress.goTo', { number: n })}
            />
            {/* The finish panel carries its own three choices, so the shared
                Next button steps aside there rather than competing with them. */}
            {!onFinishPanel && (
              <Button className="mt-1 h-12 w-full text-base" onClick={advance}>
                {index === JOURNEY_LAST - 1 ? t('journey.start') : t('journey.next')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
