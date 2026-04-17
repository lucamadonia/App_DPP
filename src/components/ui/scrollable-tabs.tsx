import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollableTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show fade-edges when content overflows. Default true */
  fadeEdges?: boolean;
  /** Show chevron buttons when scrollable. Default true */
  showChevrons?: boolean;
  /** Auto-scroll active child into view on mount + change. Default true */
  autoScrollActive?: boolean;
}

/**
 * Wraps a shadcn `TabsList` (or any horizontally-laid tab strip) in a
 * scrollable container with fade-edge indicators and optional chevrons.
 *
 * Usage:
 *   <ScrollableTabs>
 *     <TabsList>
 *       <TabsTrigger value="a">A</TabsTrigger>
 *       ...
 *     </TabsList>
 *   </ScrollableTabs>
 *
 * Works with Radix Tabs; chevrons don't steal focus so keyboard nav
 * (arrow keys) stays on the active TabsTrigger.
 */
export function ScrollableTabs({
  children,
  fadeEdges = true,
  showChevrons = true,
  autoScrollActive = true,
  className,
  ...rest
}: ScrollableTabsProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  React.useEffect(() => {
    if (!autoScrollActive) return;
    const el = scrollRef.current;
    if (!el) return;
    // Find active tab (Radix marks with data-state=active)
    const active = el.querySelector<HTMLElement>('[data-state="active"]');
    if (active) {
      active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [autoScrollActive, children]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = el.clientWidth * 0.6 * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative', className)} {...rest}>
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        role="region"
        aria-label="Scrollable tab list"
      >
        {children}
      </div>

      {fadeEdges && canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
      )}
      {fadeEdges && canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
      )}

      {showChevrons && canScrollLeft && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollBy('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-background/95 border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {showChevrons && canScrollRight && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollBy('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-background/95 border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
