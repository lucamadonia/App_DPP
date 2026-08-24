import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { spring, timing } from '@/lib/motion';
import { hideNativeSplash, removeBootSplash } from '@/lib/native-init';
import { isNative } from '@/lib/platform';
import { useBranding } from '@/hooks/use-branding';

const MIN_VISIBLE_MS = 550;
const MAX_VISIBLE_MS = 900;

interface AppSplashProps {
  /** True once the app has everything it needs to render the first screen. */
  ready: boolean;
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
export function AppSplash({ ready, children }: AppSplashProps) {
  // The branded intro is a native-app moment. On the web it would add ~550ms
  // to every reload of an admin tool people refresh constantly, so there we
  // only tear down the boot splash and get out of the way.
  const showIntro = isNative();
  const [skipped, setSkipped] = useState(false);
  // Two independent gates instead of a render-time timestamp (which is an
  // impure call): `minElapsed` guarantees the intro does not flicker on a fast
  // cold start, `timedOut` guarantees a slow network can never hold the app
  // hostage behind the splash.
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const prefersReduced = useReducedMotion();
  const { branding } = useBranding();

  // Hand off from the native/boot splash once React has actually painted.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(async () => {
        await document.fonts?.ready?.catch(() => undefined);
        await hideNativeSplash();
        removeBootSplash();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    const floor = prefersReduced ? 0 : MIN_VISIBLE_MS;
    const a = window.setTimeout(() => setMinElapsed(true), floor);
    const b = window.setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [showIntro, prefersReduced]);

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
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ background: '#0F172A' }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: timing.normal, ease: 'easeOut' }}
            onClick={() => setSkipped(true)}
          >
            <motion.img
              src={branding.logo || '/trackbliss-logo.png'}
              alt=""
              width={96}
              height={96}
              className="size-24 object-contain"
              initial={prefersReduced ? false : { scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.gentle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
