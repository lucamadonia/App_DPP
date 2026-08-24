import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/motion';
import type { MotionBudget } from '@/hooks/use-motion-budget';

export interface SplashStageProps {
  logoSrc: string;
  budget: MotionBudget;
  /** Show the wordmark. Suppressed for white-label tenants, whose mark stands alone. */
  showWordmark: boolean;
}

/**
 * Everything visual about the splash.
 *
 * Split out of AppSplash so the sequencing — which is the fragile part, and the
 * only reason the three-stage handoff looks gapless — does not get buried under
 * decoration.
 *
 * Deliberately no photograph here. Decoding a 1080x1920 backdrop costs 20-60 ms
 * of main thread on a mid-range Android, and it would land exactly while React
 * is mounting the router tree and AuthProvider is restoring the session. Every
 * cold start would pay it. Photography belongs in the journey, which is seen
 * once and has a Next button to preload behind.
 *
 * Nothing here is awaited and nothing gates the handoff. All four layers are
 * declarative and compositor-only (transform / opacity).
 */
export function SplashStage({ logoSrc, budget, showWordmark }: SplashStageProps) {
  const prefersReduced = useReducedMotion();
  const rich = budget === 'full' && !prefersReduced;

  return (
    <>
      {/* Aurora. Painted as radial gradients rather than blurred divs: a 64px
          filter: blur() on a viewport-sized element is the single most
          expensive thing to ask of an Android WebView during boot, and the
          gradient is already soft. */}
      {budget !== 'minimal' && (
        <>
          <motion.div
            aria-hidden
            className="fr-aurora -left-1/4 -top-1/4 size-[80vmax]"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.22), transparent 62%)',
            }}
            initial={prefersReduced ? false : { x: -24, y: -12, scale: 0.94 }}
            animate={{ x: 0, y: 0, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            aria-hidden
            className="fr-aurora -bottom-1/4 -right-1/4 size-[70vmax]"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 62%)',
            }}
            initial={prefersReduced ? false : { x: 24, y: 12, scale: 0.94 }}
            animate={{ x: 0, y: 0, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      )}

      {/* The logo MUST NOT move. The whole gapless illusion is that it lands at
          exactly the position and size of the #boot-splash logo in index.html
          (96px, dead centre). Only light travels across it. */}
      <div className="relative flex flex-col items-center">
        <div className="relative size-24 overflow-hidden">
          <motion.img
            src={logoSrc}
            alt=""
            width={96}
            height={96}
            className="size-24 object-contain"
            initial={prefersReduced ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.gentle}
          />
          {rich && (
            <span
              aria-hidden
              className="fr-sweep pointer-events-none absolute inset-y-0 w-1/3"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              }}
            />
          )}
        </div>

        {showWordmark && (
          <motion.span
            className="absolute top-[calc(100%+0.75rem)] text-sm font-semibold tracking-[0.2em] text-slate-400"
            initial={prefersReduced ? false : { opacity: 0, y: 6, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            TRACKBLISS
          </motion.span>
        )}
      </div>

      {/* Progress hairline. The biggest win for *perceived* speed: the same
          550 ms reads as intent rather than as a hang. Purely decorative — it
          is never wired to real progress, and the parent's fade takes it out. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
        style={{ marginBottom: 'var(--safe-bottom)' }}
      >
        <div
          className="fr-hairline h-full w-full"
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
          }}
        />
      </div>
    </>
  );
}
