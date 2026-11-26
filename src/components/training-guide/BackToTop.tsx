import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-[calc(var(--safe-bottom)+var(--bottom-nav-h)+1rem)] right-4 md:bottom-6 md:right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-lg hover:border-primary/30 hover:text-primary hover:shadow-xl transition-[box-shadow,background-color,border-color,color] animate-guide-fab-appear"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
