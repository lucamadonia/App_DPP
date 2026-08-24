import { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useDeviceMotion } from '@/hooks/use-device-motion';

export type MotionBudget = 'full' | 'reduced' | 'minimal';

/**
 * How much motion this device/user should get.
 *
 *  full     — everything: directional transitions, gestures, blur, stagger
 *  minimal  — low-end hardware: transform/opacity only, no blur, no stagger,
 *             tweens instead of springs, gestures still allowed
 *  reduced  — the user asked for less motion: opacity crossfades only,
 *             no directional travel, no gesture-driven animation
 *
 * The value is also published as `data-motion` (and `data-perf`) on <html> so
 * CSS can react without every component branching in JS. `--blur-bar` /
 * `--blur-sheet` collapse to 0 under `data-perf="low"` (see src/index.css).
 */
export function useMotionBudget(): MotionBudget {
  const prefersReduced = useReducedMotion();
  const { isLowEnd } = useDeviceMotion();

  const budget = useMemo<MotionBudget>(() => {
    if (prefersReduced) return 'reduced';
    if (isLowEnd || saveDataEnabled()) return 'minimal';
    return 'full';
  }, [prefersReduced, isLowEnd]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = budget;
    if (budget === 'minimal') root.dataset.perf = 'low';
    else delete root.dataset.perf;
  }, [budget]);

  return budget;
}

function saveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}
