/**
 * IntersectionObserver hook for entry animations in the Custom DPP template.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { DPPEntryAnimation } from '@/types/database';

export function useCustomAnimations(
  animation: DPPEntryAnimation,
  stagger: boolean,
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());

  const register = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (animation === 'none' || !element) return;
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const entryId = entry.target.getAttribute('data-anim-id');
                if (entryId) {
                  setVisibleSet((prev) => new Set(prev).add(entryId));
                  observerRef.current?.unobserve(entry.target);
                }
              }
            });
          },
          { threshold: 0.1 },
        );
      }
      element.setAttribute('data-anim-id', id);
      observerRef.current.observe(element);
    },
    [animation],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const getAnimationStyle = useCallback(
    (id: string, index: number): React.CSSProperties => {
      if (animation === 'none') return {};

      const isVisible = visibleSet.has(id);
      const delay = stagger ? `${index * 80}ms` : '0ms';

      const base: React.CSSProperties = {
        transition: `opacity 0.5s ease-out ${delay}, transform 0.5s ease-out ${delay}`,
      };

      if (!isVisible) {
        switch (animation) {
          case 'fade-in':
            return { ...base, opacity: 0 };
          case 'slide-up':
            return { ...base, opacity: 0, transform: 'translateY(20px)' };
          case 'slide-left':
            return { ...base, opacity: 0, transform: 'translateX(20px)' };
          case 'scale':
            return { ...base, opacity: 0, transform: 'scale(0.95)' };
          default:
            return base;
        }
      }

      return { ...base, opacity: 1, transform: 'none' };
    },
    [animation, stagger, visibleSet],
  );

  return { register, getAnimationStyle };
}
