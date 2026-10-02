import { useEffect, useRef } from 'react';

/**
 * Calls `callback` every `intervalMs` while the document is visible.
 * Polling pauses when the tab is hidden; when it becomes visible again and a
 * tick was missed, the callback runs once immediately. Used for carrier
 * tracking refreshes, which are quota-limited on the DHL side.
 */
export function useVisibleInterval(callback: () => void, intervalMs: number, enabled = true): void {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0 || typeof document === 'undefined') return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let lastRun = Date.now();

    const tick = () => {
      lastRun = Date.now();
      savedCallback.current();
    };
    const start = () => {
      if (timer === null) timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastRun >= intervalMs) tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
