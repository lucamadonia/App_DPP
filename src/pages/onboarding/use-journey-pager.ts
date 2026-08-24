import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, type MotionValue, type PanInfo } from 'framer-motion';
import { routeTransition } from '@/lib/motion';
import { haptic } from '@/lib/haptics';
import type { MotionBudget } from '@/hooks/use-motion-budget';

export interface JourneyPagerApi {
  index: number;
  width: number;
  /** Live track offset. Parallax and the progress fill both read this, which is
   *  why it is created here rather than inside the pager component — the
   *  progress bar renders in the footer, outside the track. */
  x: MotionValue<number>;
  measureViewport: (el: HTMLDivElement | null) => void;
  goTo: (next: number) => void;
  advance: () => void;
  handleDragEnd: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  handleTap: () => void;
}

export function useJourneyPager(opts: {
  last: number;
  budget: MotionBudget;
  onFinish: () => void;
}): JourneyPagerApi {
  const { last, budget, onFinish } = opts;

  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  // Mirrored in a ref so the drag handler can read the current page without
  // being re-created (and re-attached) on every page change.
  const indexRef = useRef(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const x = useMotionValue(0);

  // Measured via a ref callback rather than an effect: the ResizeObserver
  // callback is what calls setState, which keeps this clear of the
  // react-hooks/set-state-in-effect rule and needs no separate cleanup effect.
  const measureViewport = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setWidth(box.width);
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  // Drives the track imperatively instead of via an `animate` prop, because
  // parallax has to follow the finger rather than the settled index. This
  // effect starts an animation; it never calls setState.
  useEffect(() => {
    const controls = animate(x, -index * width, routeTransition(budget));
    return () => controls.stop();
  }, [x, index, width, budget]);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === indexRef.current) return;
    indexRef.current = clamped;
    haptic.light();
    setIndex(clamped);
  }, [last]);

  const advance = useCallback(() => {
    if (indexRef.current >= last) onFinish();
    else goTo(indexRef.current + 1);
  }, [goTo, last, onFinish]);

  // Tapping walks forward but never *finishes* — leaving the tour has to stay a
  // deliberate press on one of the three choices.
  const handleTap = useCallback(() => {
    if (indexRef.current < last) goTo(indexRef.current + 1);
  }, [goTo, last]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // A short flick counts as much as a long drag — matching the platform
      // pagers people already have muscle memory for.
      const threshold = Math.max(48, width * 0.2);
      if (info.offset.x <= -threshold || info.velocity.x < -450) goTo(indexRef.current + 1);
      else if (info.offset.x >= threshold || info.velocity.x > 450) goTo(indexRef.current - 1);
    },
    [goTo, width]
  );

  return { index, width, x, measureViewport, goTo, advance, handleDragEnd, handleTap };
}
