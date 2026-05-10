import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface DeviceMotion {
  reduceMotion: boolean;
  isCoarsePointer: boolean;
  isLowEnd: boolean;
}

/**
 * Device-motion budget for the Mega Dashboard.
 *
 * Wraps three signals so consumers can branch animation cost in one place:
 *  - `reduceMotion`     — user's OS-level prefers-reduced-motion
 *  - `isCoarsePointer`  — touch device (no hover, larger hit targets)
 *  - `isLowEnd`         — heuristic: ≤4 logical cores, likely a phone
 *
 * The dashboard uses this to drop aurora blurs, shorten staggers, and
 * snap animated counters on low-power devices.
 */
export function useDeviceMotion(): DeviceMotion {
  const reduceMotion = useReducedMotion();
  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);
  const isLowEnd = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return (navigator.hardwareConcurrency ?? 8) <= 4;
  }, []);
  return { reduceMotion: !!reduceMotion, isCoarsePointer, isLowEnd };
}
