import { useRef, useState, useEffect } from 'react';

export function useScrollReveal(options?: { threshold?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold]);

  return { ref, isVisible };
}
