import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Stagger parent
// ---------------------------------------------------------------------------
const gridStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const gridItem: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

// ---------------------------------------------------------------------------
// AnimatedList — stagger container
// ---------------------------------------------------------------------------
interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /** Override stagger delay between children (seconds) */
  staggerDelay?: number;
}

export function AnimatedList({
  children,
  className,
  staggerDelay,
}: AnimatedListProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const variants: Variants = staggerDelay
    ? {
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.05,
          },
        },
      }
    : gridStagger;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AnimatedListItem — stagger child
// ---------------------------------------------------------------------------
interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  /** Enable layout animation for reorder (default: false) */
  layout?: boolean;
  /** Unique key for AnimatePresence tracking */
  itemKey?: string | number;
}

export function AnimatedListItem({
  children,
  className,
  layout = false,
  itemKey,
}: AnimatedListItemProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      variants={gridItem}
      layout={layout}
      key={itemKey}
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
