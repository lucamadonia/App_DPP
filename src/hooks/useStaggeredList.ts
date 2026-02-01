import { useState, useEffect } from 'react';

interface UseStaggeredListOptions {
  interval?: number;
  initialDelay?: number;
}

export function useStaggeredList(
  count: number,
  { interval = 50, initialDelay = 100 }: UseStaggeredListOptions = {}
): boolean[] {
  const [visible, setVisible] = useState<boolean[]>(new Array(count).fill(false));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < count; i++) {
      const timer = setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, initialDelay + i * interval);
      timers.push(timer);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [count, interval, initialDelay]);

  return visible;
}
