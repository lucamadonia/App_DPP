import { useEffect, useState } from 'react';

/**
 * Connectivity, via @capacitor/network on native and the browser events on web.
 *
 * Initialised optimistically: the real status arrives one tick later, and
 * flashing "offline" during every cold start would be worse than being briefly
 * wrong. Guest mode uses this to label which tools need a connection — four of
 * the six work entirely offline.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        if (!cancelled) setOnline(status.connected);
        const handle = await Network.addListener('networkStatusChange', (s) => {
          if (!cancelled) setOnline(s.connected);
        });
        dispose = () => void handle.remove();
      } catch {
        // Plugin unavailable (web build): fall back to the DOM events.
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        if (!cancelled) setOnline(navigator.onLine);
        dispose = () => {
          window.removeEventListener('online', on);
          window.removeEventListener('offline', off);
        };
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return online;
}
