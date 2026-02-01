import { useState, useEffect, useRef } from 'react';

interface UseAnimatedNumberOptions {
  duration?: number;
  delay?: number;
  decimals?: number;
}

export function useAnimatedNumber(
  target: number,
  { duration = 800, delay = 0, decimals = 0 }: UseAnimatedNumberOptions = {}
): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const timeout = setTimeout(() => {
      startValueRef.current = 0;
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = startValueRef.current + (target - startValueRef.current) * eased;

        setCurrent(Number(value.toFixed(decimals)));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay, decimals]);

  return current;
}
