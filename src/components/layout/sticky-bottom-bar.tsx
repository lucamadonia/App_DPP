import * as React from 'react';
import { cn } from '@/lib/utils';

interface StickyBottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** If true, shows on desktop too as inline flex bar. Default false = mobile-only sticky */
  alwaysVisible?: boolean;
  /** Stacking order. Default 40 (above mobile-bottom-nav at z-30) */
  zIndex?: number;
}

/**
 * Mobile-only fixed bottom action bar with safe-area inset padding.
 * On md+, renders children in a flex row aligned to the end.
 *
 * Use for form Save/Cancel, wizard Back/Next, bulk action confirmations.
 * Layout auto-pads page content via `safe-inset` utility class.
 */
export function StickyBottomBar({
  alwaysVisible = false,
  zIndex = 40,
  className,
  children,
  style,
  ...rest
}: StickyBottomBarProps) {
  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3',
          'flex items-center justify-between gap-2',
          'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
          alwaysVisible ? 'flex' : 'flex md:hidden',
          className
        )}
        style={{ zIndex, ...style }}
        {...rest}
      >
        {children}
      </div>
      {/* Desktop: inline spacer when not always-visible (rendered by parent) */}
      {!alwaysVisible && (
        <div
          className="hidden md:flex items-center justify-end gap-2"
          style={style}
        >
          {children}
        </div>
      )}
    </>
  );
}
