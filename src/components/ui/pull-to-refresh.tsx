import * as React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { haptic } from '@/lib/haptics';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

const THRESHOLD = 80;
const MAX_PULL = 160;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  /** The element that scrolls. Pull only arms when it is at scrollTop 0. */
  scrollRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
}

/**
 * Pull-to-refresh for list surfaces.
 *
 * Off under `reduced` motion, and off on non-touch pointers — a mouse drag
 * would trigger it accidentally.
 *
 * The indicator is a circle whose `pathLength` tracks the pull, so the whole
 * gesture animates on the compositor.
 */
export function PullToRefresh({ onRefresh, scrollRef, children, className }: PullToRefreshProps) {
  const budget = useMotionBudget();
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const armed = React.useRef(false);

  // Rubber-band: 160px of finger travel maps to 80px of indicator movement.
  const pull = useTransform(y, [0, MAX_PULL], [0, THRESHOLD], { clamp: true });
  const progress = useTransform(pull, [0, THRESHOLD], [0, 1], { clamp: true });
  const indicatorOpacity = useTransform(pull, [0, 20, THRESHOLD], [0, 0.6, 1]);

  const enabled = budget !== 'reduced';

  const atTop = () => {
    const el = scrollRef?.current;
    if (!el) return (document.scrollingElement?.scrollTop ?? 0) <= 0;
    return el.scrollTop <= 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || refreshing || e.pointerType === 'mouse') return;
    armed.current = atTop();
    startY.current = armed.current ? e.clientY : null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!armed.current || startY.current === null || refreshing) return;
    const delta = e.clientY - startY.current;
    if (delta <= 0) {
      y.set(0);
      return;
    }
    if (!atTop()) {
      armed.current = false;
      y.set(0);
      return;
    }
    y.set(Math.min(delta, MAX_PULL));
  };

  const finish = async () => {
    if (!armed.current || refreshing) {
      y.set(0);
      return;
    }
    armed.current = false;
    startY.current = null;

    if (pull.get() >= THRESHOLD - 1) {
      setRefreshing(true);
      haptic.medium();
      void animate(y, MAX_PULL * (56 / THRESHOLD), spring.gentle);
      try {
        await onRefresh();
        haptic.success();
      } catch {
        haptic.error();
      } finally {
        setRefreshing(false);
        void animate(y, 0, spring.gentle);
      }
    } else {
      void animate(y, 0, spring.gentle);
    }
  };

  return (
    <div
      className={cn('relative', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ y: pull, opacity: indicatorOpacity }}
        aria-hidden
      >
        <div className="mt-2 rounded-full bg-background/90 p-2 shadow-md backdrop-blur">
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className="text-primary"
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              refreshing
                ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                : { duration: 0.2 }
            }
          >
            <motion.circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: refreshing ? 0.25 : progress }}
            />
          </motion.svg>
        </div>
      </motion.div>

      <motion.div style={{ y: pull }}>{children}</motion.div>
    </div>
  );
}
