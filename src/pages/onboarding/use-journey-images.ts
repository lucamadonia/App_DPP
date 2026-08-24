import { useEffect, useRef, useState } from 'react';
import type { MotionBudget } from '@/hooks/use-motion-budget';
import { JOURNEY_SLIDES } from './journey-slides';

export type ImageState = 'idle' | 'ready' | 'failed';

/**
 * Keep at most this many decoded backdrops alive.
 *
 * Seven decoded 1080x1920 bitmaps is roughly 65 MB of RAM, which is enough to
 * get the process killed by Android's low-memory killer on a 2 GB device. A
 * sliding window of four covers the current slide plus a look-ahead without
 * ever holding the whole deck.
 */
const WINDOW = 4;

export function assetUrl(slug: string): string {
  return `/first-run/${slug}.webp`;
}

/**
 * Decode backdrops just ahead of the finger, and drop the ones behind.
 *
 * On native there is no network — the images ship inside the APK and are served
 * from the local Capacitor server — so latency is nil and decode plus memory is
 * the entire cost profile. Decoding is done off the critical path via
 * `img.decode()`, and a slide only swaps from its inlined LQIP to the real
 * bitmap once that resolves, so nothing ever decodes synchronously mid-drag.
 *
 * Under `minimal` this short-circuits to 'failed' for everything, which routes
 * every slide down the illustration path. One code path, not two.
 */
export function useJourneyImages(index: number, budget: MotionBudget) {
  const [state, setState] = useState<Record<string, ImageState>>({});
  const live = useRef(new Map<string, HTMLImageElement>());

  useEffect(() => {
    if (budget === 'minimal') return;

    let cancelled = false;
    const wanted = new Set<string>();
    for (let i = index; i < index + 3; i += 1) {
      const slide = JOURNEY_SLIDES[i];
      if (slide) wanted.add(slide.image);
    }
    // Keep the previous slide decoded too, so a swipe back is instant.
    const prev = JOURNEY_SLIDES[index - 1];
    if (prev) wanted.add(prev.image);

    for (const slug of wanted) {
      if (live.current.has(slug)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = assetUrl(slug);
      live.current.set(slug, img);
      img
        .decode()
        .then(() => {
          if (!cancelled) setState((s) => (s[slug] === 'ready' ? s : { ...s, [slug]: 'ready' }));
        })
        .catch(() => {
          // Corrupt asset or OOM. The slide falls back to its illustration,
          // which is the same path `minimal` uses — already built and tested.
          if (!cancelled) setState((s) => ({ ...s, [slug]: 'failed' }));
        });
    }

    // Release anything outside the window so the bitmap can be collected.
    if (live.current.size > WINDOW) {
      for (const [slug, img] of live.current) {
        if (wanted.has(slug)) continue;
        img.src = '';
        live.current.delete(slug);
        if (live.current.size <= WINDOW) break;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [index, budget]);

  // Release every decoded bitmap on unmount. The Map instance is captured inside
  // the effect rather than read through the ref in the cleanup: `.current` is
  // never reassigned here, only mutated, so the captured reference is the same
  // object — and doing it this way keeps the exhaustive-deps rule satisfied
  // without an eslint-disable.
  useEffect(() => {
    const decoded = live.current;
    return () => {
      for (const img of decoded.values()) img.src = '';
      decoded.clear();
    };
  }, []);

  return (slug: string): ImageState => {
    if (budget === 'minimal') return 'failed';
    return state[slug] ?? 'idle';
  };
}
