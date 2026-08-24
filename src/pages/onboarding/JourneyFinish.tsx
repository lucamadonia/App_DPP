import { motion, useReducedMotion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/button';
import { staggerDelayFor } from '@/lib/motion';
import type { MotionBudget } from '@/hooks/use-motion-budget';

export interface JourneyFinishProps {
  budget: MotionBudget;
  active: boolean;
  t: TFunction;
  onCreateAccount: () => void;
  onExplore: () => void;
  onSignIn: () => void;
}

/**
 * The conversion moment, as panel eight of the pager rather than its own route.
 *
 * A route would mean a PageTransition push, a portal teardown, dead drag physics
 * and a history entry that drops Android's back button onto slide 7 of a tour
 * the user just finished. Inside the pager, back is simply a right swipe.
 *
 * No photograph here, so this is the one place in the journey that can afford
 * real glass — nothing is moving behind it.
 */
export function JourneyFinish({
  budget,
  active,
  t,
  onCreateAccount,
  onExplore,
  onSignIn,
}: JourneyFinishProps) {
  const prefersReduced = useReducedMotion();
  const still = prefersReduced || budget === 'reduced';

  const rise = (i: number) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
          transition: { duration: 0.45, delay: staggerDelayFor(i, budget), ease: 'easeOut' as const },
        };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-7">
      {budget !== 'minimal' && (
        <div
          aria-hidden
          className="fr-aurora left-1/2 top-1/4 size-[80vmax] -translate-x-1/2"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18), transparent 62%)' }}
        />
      )}

      <div className="relative w-full max-w-sm">
        <motion.img
          src="/trackbliss-logo.png"
          alt=""
          width={64}
          height={64}
          className="mx-auto mb-7 size-16 object-contain"
          {...rise(0)}
        />

        <motion.h1
          className="text-balance text-center text-title-lg font-bold tracking-tight text-white"
          {...rise(1)}
        >
          {t('finish.title')}
        </motion.h1>

        <motion.p
          className="mt-3 text-pretty text-center text-body leading-relaxed text-white/70"
          {...rise(2)}
        >
          {t('finish.line')}
        </motion.p>

        <motion.div className="mt-9 space-y-2.5" {...rise(3)}>
          <Button className="h-12 w-full text-base" onClick={onCreateAccount}>
            {t('finish.createAccount')}
          </Button>
          <Button variant="secondary" className="h-12 w-full text-base" onClick={onExplore}>
            {t('finish.explore')}
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-full text-sm text-white/70 hover:text-white"
            onClick={onSignIn}
          >
            {t('finish.signIn')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
