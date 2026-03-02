import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface WizardStepTransitionProps {
  children: ReactNode;
  direction: 'forward' | 'backward';
  stepKey: number;
}

const slideVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

export function WizardStepTransition({ children, direction, stepKey }: WizardStepTransitionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div key={stepKey}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
