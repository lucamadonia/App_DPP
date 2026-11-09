/**
 * Gesture helpers built on framer-motion.
 *
 * Everything here is transform/opacity only, so it stays on the compositor and
 * holds 60fps inside a WebView.
 */
import { useCallback, useRef } from 'react';
import { useDragControls, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
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
  const controls = useDragControls();
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
      if (target?.closest('[data-no-swipe-back], button, a, input, textarea, select, [role="tab"], [contenteditable="true"]')) {
        armed.current = false;
        return;
      }
      armed.current = e.clientX <= EDGE_ZONE_PX;
      // Disabling commit is not enough: automatic drag listeners already move
      // the entire page before onDragEnd. Start the drag only at the edge.
      if (armed.current) {
        e.preventDefault();
        controls.start(e);
      }
    },
    [enabled, controls]
  );

  const onDragEnd = useCallback(
    (event: unknown, info: PanInfo) => {
      if (!armed.current) {
        void animate(x, 0, spring.snappy);
        return;
      }
      const width = typeof window !== 'undefined' ? window.innerWidth : 400;
      const cancelled = (event as PointerEvent | null)?.type === 'pointercancel';
      const commit = !cancelled &&
        (info.offset.x > width * COMMIT_RATIO || info.velocity.x > COMMIT_VELOCITY);
      if (commit) {
        haptic.light();
        onCommit();
        x.set(0);
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
      dragListener: false,
      dragControls: controls,
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
  /** Called once the gesture commits. Must close the sheet (or decline to). */
  onDismiss: () => void;
  /** Turn the gesture off entirely (e.g. desktop / non-bottom sheets). */
  enabled?: boolean;
  /** Fraction of the sheet height that commits a slow drag. Default 0.25. */
  ratio?: number;
  /** Average downward speed that commits regardless of distance, px/ms. Default 0.11. */
  velocity?: number;
}

/** Where a drag may start. Everything else stays a normal scroll/tap surface. */
const DRAG_HANDLE_SELECTOR =
  '[data-drag-handle], [data-slot="sheet-header"], [data-slot="dialog-header"]';
/** Never hijack these, even inside a handle (close button, header actions). */
const DRAG_IGNORE_SELECTOR =
  'button, a, input, textarea, select, label, [role="button"], [contenteditable="true"], [data-no-drag]';
/** Movement before the drag engages, so a tap with finger jitter stays a tap. */
const DRAG_SLOP_PX = 6;
const SNAP_BACK = '300ms var(--ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))';

interface DragState {
  pointerId: number;
  startY: number;
  startTime: number;
  offset: number;
  engaged: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Pulling up resists more the further you go, instead of stopping dead. */
function dampUp(dy: number): number {
  return dy >= 0 ? dy : -8 * Math.log1p(-dy / 8);
}

/**
 * Drag-to-dismiss for bottom sheets (Radix Dialog/Sheet content).
 *
 * Plain pointer events writing a transform straight to the element: no React
 * re-render per frame, and it works on any element, not just motion.* ones.
 *
 * - Engages only from a handle (grabber, sheet/dialog header), so the sheet's
 *   own scroll area keeps scrolling normally.
 * - Commits on velocity (> 0.11 px/ms) with no minimum distance, or on a slow
 *   drag past `ratio` of the height. Upward drags are damped.
 * - Pointer capture keeps tracking when the finger leaves the handle; a second
 *   finger cancels the gesture instead of making the sheet jump.
 * - On commit the sheet stays where the finger left it and Radix's exit
 *   animation carries it from there. If the close is vetoed (e.g. the caller
 *   prevents Escape while saving) it springs back.
 *
 * Spread `handlers` and attach `ref` to the sheet content element.
 */
export function useDragDismiss<T extends HTMLElement = HTMLDivElement>({
  onDismiss,
  enabled = true,
  ratio = 0.25,
  velocity = 0.11,
}: DragDismissOptions) {
  const ref = useRef<T | null>(null);
  const drag = useRef<DragState | null>(null);

  const overlayOf = (el: HTMLElement) =>
    el.parentElement?.querySelector<HTMLElement>(
      ':scope > [data-slot="sheet-overlay"], :scope > [data-slot="dialog-overlay"]'
    ) ?? null;

  const applyOffset = useCallback((offset: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = offset === 0 ? '' : `translate3d(0, ${offset}px, 0)`;
    const overlay = overlayOf(el);
    if (overlay) {
      const progress = Math.max(0, offset) / Math.max(1, el.offsetHeight);
      overlay.style.opacity = offset > 0 ? String(1 - progress) : '';
    }
  }, []);

  const snapBack = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overlay = overlayOf(el);
    if (prefersReducedMotion()) {
      el.style.transition = '';
      applyOffset(0);
      return;
    }
    el.style.transition = `transform ${SNAP_BACK}`;
    if (overlay) overlay.style.transition = `opacity ${SNAP_BACK}`;
    applyOffset(0);
    window.setTimeout(() => {
      el.style.transition = '';
      if (overlay) overlay.style.transition = '';
    }, 320);
  }, [applyOffset]);

  const cancel = useCallback(() => {
    if (drag.current?.engaged) snapBack();
    drag.current = null;
  }, [snapBack]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Second finger: abandon rather than fight over which one leads.
      if (!e.isPrimary) {
        cancel();
        return;
      }
      if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const target = e.target as HTMLElement | null;
      const sheet = e.currentTarget;
      if (!target?.closest(DRAG_HANDLE_SELECTOR) || target.closest(DRAG_IGNORE_SELECTOR)) return;
      if (sheet.scrollTop > 0) return;
      drag.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startTime: e.timeStamp,
        offset: 0,
        engaged: false,
      };
    },
    [enabled, cancel]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dy = e.clientY - d.startY;
      if (!d.engaged) {
        if (Math.abs(dy) < DRAG_SLOP_PX) return;
        d.engaged = true;
        // Measure speed from engagement, not from the initial touch.
        d.startY = e.clientY;
        d.startTime = e.timeStamp;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.transition = 'none';
        return;
      }
      d.offset = dampUp(dy);
      applyOffset(d.offset);
    },
    [applyOffset]
  );

  const finish = useCallback(
    (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      drag.current = null;
      if (!d.engaged) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const elapsed = Math.max(1, e.timeStamp - d.startTime);
      const speed = d.offset / elapsed;
      const height = e.currentTarget.offsetHeight || 400;
      const commit = !cancelled && d.offset > 0 &&
        (speed > velocity || d.offset > height * ratio);
      if (!commit) {
        snapBack();
        return;
      }
      haptic.light();
      const el = e.currentTarget;
      el.style.transition = '';
      onDismiss();
      // Close vetoed (still open a moment later): put the sheet back.
      window.setTimeout(() => {
        if (el.isConnected && el.getAttribute('data-state') === 'open') snapBack();
      }, 80);
    },
    [onDismiss, ratio, velocity, snapBack]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => finish(e, false), [finish]);
  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => finish(e, true), [finish]);

  return {
    ref,
    handlers: enabled
      ? {
          'data-drag-dismiss': '',
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
        }
      : {},
  };
}
