/**
 * Gesture helpers built on framer-motion.
 *
 * Everything here is transform/opacity only, so it stays on the compositor and
 * holds 60fps inside a WebView.
 */
import { useCallback, useRef } from 'react';
import { useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { spring } from '@/lib/motion';
import { haptic } from '@/lib/haptics';

/** Pointer must start within this many px of the left edge to arm swipe-back. */
const EDGE_ZONE_PX = 24;
/** Fraction of the viewport width that commits the gesture. */
const COMMIT_RATIO = 0.35;
/** Or this horizontal velocity, in px/s. */
const COMMIT_VELOCITY = 500;

export interface SwipeBackOptions {
  enabled: boolean;
  onCommit: () => void;
}

/**
 * iOS-style interactive back gesture.
 *
 * Deliberately edge-armed: a full-width drag would fight every horizontally
 * scrollable region in the app (there are 80+ `overflow-x-auto` containers).
 * Mark any such region with `data-no-swipe-back` to opt it out entirely.
 */
export function useSwipeBack({ enabled, onCommit }: SwipeBackOptions) {
  const x = useMotionValue(0);
  const armed = useRef(false);

  /** Shadow of the page underneath, fading as the current page slides away. */
  const backdropOpacity = useTransform(x, [0, 300], [0.25, 0]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) {
        armed.current = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-no-swipe-back]')) {
        armed.current = false;
        return;
      }
      armed.current = e.clientX <= EDGE_ZONE_PX;
    },
    [enabled]
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!armed.current) {
        void animate(x, 0, spring.snappy);
        return;
      }
      const width = typeof window !== 'undefined' ? window.innerWidth : 400;
      const commit =
        info.offset.x > width * COMMIT_RATIO || info.velocity.x > COMMIT_VELOCITY;
      if (commit) {
        haptic.light();
        onCommit();
      } else {
        void animate(x, 0, spring.snappy);
      }
      armed.current = false;
    },
    [x, onCommit]
  );

  return {
    enabled,
    x,
    backdropOpacity,
    dragProps: {
      drag: enabled ? ('x' as const) : (false as const),
      dragDirectionLock: true,
      dragConstraints: { left: 0, right: 0 },
      dragElastic: { left: 0, right: 0.9 },
      style: { x },
      onPointerDown,
      onDragEnd,
    },
  };
}

export interface DragDismissOptions {
  onDismiss: () => void;
  /** Fraction of the element height that commits a dismiss. Default 0.3. */
  ratio?: number;
  /** Vertical velocity that commits a dismiss. Default 600 px/s. */
  velocity?: number;
}

/**
 * Drag-to-dismiss for bottom sheets, with rubber-banding upwards.
 *
 * This is the difference between a "web modal" and an "app sheet": you can
 * fling it away, and pulling up resists instead of moving freely.
 *
 * The drag must only engage when the sheet's inner scroller is at the top,
 * otherwise it steals the scroll. Wire `onPointerDown` to check that.
 */
export function useDragDismiss({ onDismiss, ratio = 0.3, velocity = 600 }: DragDismissOptions) {
  const y = useMotionValue(0);
  const scrollAtTop = useRef(true);

  const backdropOpacity = useTransform(y, [0, 400], [1, 0]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const scroller = (e.target as HTMLElement | null)?.closest('[data-sheet-scroll]');
    scrollAtTop.current = !scroller || scroller.scrollTop <= 0;
  }, []);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const height = 400;
      const commit = info.offset.y > height * ratio || info.velocity.y > velocity;
      if (commit && scrollAtTop.current) {
        haptic.light();
        onDismiss();
      } else {
        void animate(y, 0, spring.default);
      }
    },
    [y, onDismiss, ratio, velocity]
  );

  return {
    y,
    backdropOpacity,
    dragProps: {
      drag: 'y' as const,
      dragDirectionLock: true,
      dragConstraints: { top: 0, bottom: 0 },
      // Rubber-band upwards (0.05), move freely downwards (0.6).
      dragElastic: { top: 0.05, bottom: 0.6 },
      style: { y },
      onPointerDown,
      onDragEnd,
    },
  };
}
