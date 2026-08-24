import { motion, AnimatePresence } from 'framer-motion';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { timing } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface SuccessBurstProps {
  show: boolean;
  className?: string;
  /** px; the checkmark and ring scale with it. */
  size?: number;
}

/**
 * The "it worked" moment: a checkmark that draws itself inside an expanding
 * ring. For return approved, shipment sent, compliance check passed, stocktake
 * finished — the handful of places where a confirmation deserves more than a
 * toast.
 *
 * Only `pathLength`, `scale` and `opacity` animate, so it is compositor-only.
 * No confetti library: the payload is not worth it and it ages badly.
 */
export function SuccessBurst({ show, className, size = 72 }: SuccessBurstProps) {
  const budget = useMotionBudget();
  const reduced = budget === 'reduced';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn('pointer-events-none relative grid place-items-center', className)}
          style={{ width: size, height: size }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: timing.fast }}
          role="status"
          aria-live="polite"
        >
          {!reduced && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-success"
              initial={{ scale: 0.6, opacity: 1 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: timing.emphasis, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <svg
            viewBox="0 0 52 52"
            className="size-full text-success"
            fill="none"
            aria-hidden
          >
            <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <motion.path
              d="M15 27l8 8 15-16"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: timing.emphasis, ease: [0.16, 1, 0.3, 1] }
              }
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
