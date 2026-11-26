/**
 * Appearance change with a circular reveal from the user's finger.
 *
 * Switching style or light/dark is rare and deliberate, so it earns a moment
 * of delight: the new look grows out of the tapped control as a circle
 * (clip-path on the View Transition snapshot), so the change has an obvious
 * cause and direction instead of the whole screen flashing.
 *
 * - Compositor-only: clip-path on the snapshot layer, no layout or repaint
 *   of the live DOM during the animation.
 * - Reduced motion: a 150ms crossfade, no movement.
 * - No View Transition support (older WebViews): applied instantly.
 */

export interface RevealOrigin {
  x: number;
  y: number;
}

const DURATION_MS = 460;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function originFromElement(el: Element | null | undefined): RevealOrigin | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

let running = false;

export function transitionAppearance(apply: () => void, origin?: RevealOrigin): void {
  const doc = document as ViewTransitionDoc;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rapid re-taps: never queue snapshots, just land on the latest state.
  // A scrolled document (public/web pages) offsets the root snapshot in
  // WebKit/Chromium, so only reveal when the window itself is unscrolled —
  // always true inside the app shell, which scrolls its own <main>.
  if (!doc.startViewTransition || running || window.scrollY !== 0) {
    apply();
    return;
  }

  const root = document.documentElement;
  root.dataset.appearanceTransition = reduced ? 'fade' : 'reveal';
  running = true;

  const transition = doc.startViewTransition(apply);

  const cleanup = () => {
    running = false;
    delete root.dataset.appearanceTransition;
  };
  transition.finished.then(cleanup, cleanup);

  if (reduced) return;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // Farthest corner, so the circle always finishes covering the screen.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION_MS, easing: EASE_OUT, pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(() => {
      /* transition skipped (e.g. page hidden): state is already applied */
    });
}
