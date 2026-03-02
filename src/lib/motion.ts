/**
 * Shared Framer Motion configuration for Trackbliss.
 * Centralized timing, spring configs, and reusable variants.
 */
import {
  type Transition,
  type Variants,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import { useRef, type RefObject, type MouseEvent } from 'react';

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
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
} as const;

// ---------------------------------------------------------------------------
// Page transition variants (blur-in upgrade)
// ---------------------------------------------------------------------------
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)' },
};

export const pageTransition: Transition = spring.gentle;

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
// Card entrance with spring (for cards, panels)
// ---------------------------------------------------------------------------
export const cardEntrance: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.snappy,
  },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// Tab content crossfade (horizontal slide + fade)
// ---------------------------------------------------------------------------
export const tabContentVariants: Variants = {
  initial: { opacity: 0, x: 8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.12 } },
};

// ---------------------------------------------------------------------------
// Grid stagger (parent + child) with scale
// ---------------------------------------------------------------------------
export const gridStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const gridItem: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

// ---------------------------------------------------------------------------
// Blur-in entrance (for headings, hero areas)
// ---------------------------------------------------------------------------
export const blurIn: Variants = {
  initial: { opacity: 0, filter: 'blur(8px)', y: 12 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },
};

// ---------------------------------------------------------------------------
// Scroll reveal (for whileInView)
// ---------------------------------------------------------------------------
export const scrollRevealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 18, duration: 0.6 },
  },
};

// ---------------------------------------------------------------------------
// 3D Tilt hook — cursor-tracking rotateX/rotateY on a ref
// ---------------------------------------------------------------------------
export function use3DTilt(intensity = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rawRotateX = useTransform(mouseY, [0, 1], [intensity, -intensity]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-intensity, intensity]);

  const rotateX = useSpring(rawRotateX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return {
    ref: ref as RefObject<HTMLDivElement>,
    style: { rotateX, rotateY, transformPerspective: 800 },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}

// ---------------------------------------------------------------------------
// Re-export useReducedMotion for convenience
// ---------------------------------------------------------------------------
export { useReducedMotion };
