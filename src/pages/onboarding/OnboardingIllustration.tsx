import { motion, type Transition, type Variants } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { MotionBudget } from '@/hooks/use-motion-budget';
import { routeTransition, timing } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface OnboardingIllustrationProps {
  /** Icon shown in the centre disc. */
  icon: LucideIcon;
  /** Two supporting icons pinned to opposite corners. */
  satellites: readonly [LucideIcon, LucideIcon];
  /** Tailwind gradient stops for the panel, e.g. `from-sky-500/20 to-indigo-500/10`. */
  tint: string;
  /** Whether this slide is the one on screen — drives the entrance. */
  active: boolean;
  budget: MotionBudget;
}

/**
 * The per-screen graphic: Lucide icons composed into a panel, no image assets.
 *
 * Only `transform` and `opacity` are animated, so the whole thing stays on the
 * compositor while the pager is being dragged underneath it.
 */
export function OnboardingIllustration({
  icon: Icon,
  satellites,
  tint,
  active,
  budget,
}: OnboardingIllustrationProps) {
  const [SatelliteA, SatelliteB] = satellites;
  const reduced = budget === 'reduced';
  const transition: Transition = reduced
    ? { duration: timing.fast, ease: 'easeOut' }
    : routeTransition(budget);

  // `reduced` gets opacity only — no travel, no scale.
  const discVariants: Variants = reduced
    ? { off: { opacity: 0 }, on: { opacity: 1 } }
    : { off: { opacity: 0, scale: 0.88 }, on: { opacity: 1, scale: 1 } };

  const satelliteVariants: Variants = reduced
    ? { off: { opacity: 0 }, on: { opacity: 1 } }
    : { off: { opacity: 0, y: 10, scale: 0.9 }, on: { opacity: 1, y: 0, scale: 1 } };

  const state = active ? 'on' : 'off';

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        className={cn(
          'relative flex size-44 items-center justify-center rounded-[2rem] bg-gradient-to-br sm:size-52',
          tint
        )}
      >
        {/* Soft glow — dropped entirely on constrained devices. */}
        {budget === 'full' && (
          <div
            aria-hidden
            className={cn('absolute inset-6 rounded-full bg-gradient-to-br blur-2xl', tint)}
          />
        )}

        <motion.div
          className="relative flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg sm:size-24"
          variants={discVariants}
          initial="off"
          animate={state}
          transition={transition}
        >
          <Icon className="size-9 sm:size-11" strokeWidth={1.6} aria-hidden />
        </motion.div>

        <motion.div
          className="absolute -left-3 top-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
          variants={satelliteVariants}
          initial="off"
          animate={state}
          transition={{ ...transition, delay: reduced ? 0 : 0.06 }}
        >
          <SatelliteA className="size-5" strokeWidth={1.7} aria-hidden />
        </motion.div>

        <motion.div
          className="absolute -right-3 bottom-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
          variants={satelliteVariants}
          initial="off"
          animate={state}
          transition={{ ...transition, delay: reduced ? 0 : 0.12 }}
        >
          <SatelliteB className="size-5" strokeWidth={1.7} aria-hidden />
        </motion.div>
      </div>
    </div>
  );
}
