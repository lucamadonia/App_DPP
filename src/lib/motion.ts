/**
 * Shared Framer Motion configuration for Trackbliss.
 * Centralized timing, spring configs, and reusable variants.
 */
import { type Transition, type Variants, useReducedMotion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Timing scales (seconds) - consistent across the entire app
// ---------------------------------------------------------------------------
export const timing = {
  micro: 0.15,   // button press, icon swap
  fast: 0.2,     // tooltip, dropdown open
  normal: 0.3,   // page transition, card hover
  emphasis: 0.5, // modal entrance, celebration
  slow: 0.8,     // counter animation, progress bar
} as const;

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------
export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  gentle: { type: 'spring', stiffness: 200, damping: 20 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 15 } as Transition,
} as const;

// ---------------------------------------------------------------------------
// Page transition variants (fade + subtle slide)
// ---------------------------------------------------------------------------
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: timing.normal,
  ease: [0.25, 0.1, 0.25, 1], // cubic-bezier ease-out
};

// ---------------------------------------------------------------------------
// Stagger container variant (for lists / grids)
// ---------------------------------------------------------------------------
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: timing.normal, ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Fade-in variant
// ---------------------------------------------------------------------------
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: timing.fast } },
  exit: { opacity: 0, transition: { duration: timing.micro } },
};

// ---------------------------------------------------------------------------
// Scale-in variant (for modals / popovers)
// ---------------------------------------------------------------------------
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: timing.micro } },
};

// ---------------------------------------------------------------------------
// Re-export useReducedMotion for convenience
// ---------------------------------------------------------------------------
export { useReducedMotion };
