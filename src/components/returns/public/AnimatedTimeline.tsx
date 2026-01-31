import { useEffect, useRef, useState } from 'react';
import { ReturnTimeline } from '@/components/returns/ReturnTimeline';
import type { RhReturnTimeline } from '@/types/returns-hub';

interface AnimatedTimelineProps {
  entries: RhReturnTimeline[];
}

export function AnimatedTimeline({ entries }: AnimatedTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <ReturnTimeline entries={entries} />
    </div>
  );
}
