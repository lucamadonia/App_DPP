import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { timing } from '@/lib/motion';
import type { MotionBudget } from '@/hooks/use-motion-budget';
import { SplashStage } from './SplashStage';
import { hideNativeSplash, removeBootSplash } from '@/lib/native-init';
import { isNative } from '@/lib/platform';

// The choreography lands its last beat (shipment delivered) at ~4 s; the
// floor lets it finish, the ceiling keeps a slow start from feeling stuck.
// Tapping skips either.
const MIN_VISIBLE_MS = 4100;
const MAX_VISIBLE_MS = 5200;
// Exit is a short push "through" the splash into the app, not a plain fade.
const EXIT_EASE = [0.4, 0, 0.2, 1] as const;

interface AppSplashProps {
  /** True once the app has everything it needs to render the first screen. */
  ready: boolean;
  /**
   * Passed in rather than read from useMotionBudget() here: AppShellBootstrap
   * already calls that hook, and calling it again would spin up a second
   * useDeviceMotion subscription during the most contended 500 ms of the app's
   * life, for nothing.
   */
  budget: MotionBudget;
  children: React.ReactNode;
}

/**
 * Branded intro that takes over from the native splash.
 *
 * Sequencing is the whole point here:
 *  1. Mount at the exact position/size of the #boot-splash logo.
 *  2. After two animation frames (React has painted), hide the native splash
 *     and remove #boot-splash — in that order, so something opaque is always
 *     on screen.
 *  3. Play the intro, but never block on it: as soon as `ready` flips and the
 *     minimum has elapsed, fade out.
 */
export function AppSplash({ ready, budget, children }: AppSplashProps) {
  // The branded intro is a native-app moment. On the web it would delay
  // every reload of an admin tool people refresh constantly, so there we
  // only tear down the boot splash and get out of the way.
  const showIntro = isNative();
  const [skipped, setSkipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // Two independent gates instead of a render-time timestamp (which is an
  // impure call): `minElapsed` guarantees the intro does not flicker on a fast
  // cold start, `timedOut` guarantees a slow network can never hold the app
  // hostage behind the splash.
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const prefersReduced = useReducedMotion();

  // Hand off from the native/boot splash once React has actually painted.
  useEffect(() => {
    let raf2 = 0;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      removeBootSplash(showIntro);
      setRevealed(true);
    };
    const fallback = window.setTimeout(reveal, 2000);
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(async () => {
        // The logo is an image. Waiting for every font can strand the opaque
        // boot layer indefinitely when a font request stalls offline.
        await hideNativeSplash();
        window.clearTimeout(fallback);
        reveal();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(fallback);
    };
  }, [showIntro]);

  useEffect(() => {
    // Count visible time only after the native/HTML layers have handed over.
    if (!showIntro || !revealed) return;
    const floor = prefersReduced ? 0 : MIN_VISIBLE_MS;
    const a = window.setTimeout(() => setMinElapsed(true), floor);
    const b = window.setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [showIntro, revealed, prefersReduced]);

  // Derived, not stored: setting state from an effect just to mirror props
  // causes an extra render pass and trips react-hooks/set-state-in-effect.
  const visible = showIntro && !skipped && !timedOut && !(ready && minElapsed);

  return (
    <>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="app-splash"
            className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
            data-testid="app-splash"
            data-revealed={revealed}
            aria-hidden="true"
            style={{ background: '#0F172A' }}
            initial={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
            transition={
              prefersReduced
                ? { duration: timing.micro, ease: 'easeOut' }
                : { duration: 0.42, ease: EXIT_EASE }
            }
            onClick={() => setSkipped(true)}
          >
            <SplashStage
              logoSrc="/icons/splash-mark.png"
              budget={budget}
              active={revealed}
              showWordmark
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
