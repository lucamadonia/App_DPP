import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDragDismiss } from '@/lib/motion-gestures';

type DrawerSide = 'auto' | 'right' | 'bottom' | 'left' | 'top';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Default: 'auto' = bottom on mobile, right on md+ */
  side?: DrawerSide;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Max viewport width constraint (CSS value). Default: min(88vw, 400px) */
  maxWidth?: string;
  /** Max viewport height constraint (CSS value) for bottom drawer. Default: 90vh */
  maxHeight?: string;
  showCloseButton?: boolean;
}

/**
 * Thin wrapper over shadcn Sheet with mobile-first defaults:
 * - Bottom sheet on mobile (thumb-reach), right drawer on desktop
 * - Safe-area bottom padding
 * - Max-width/height guards against viewport overflow
 * - Title + description for a11y
 */
export function MobileDrawer({
  open,
  onOpenChange,
  title,
  description,
  side = 'auto',
  children,
  footer,
  className,
  maxWidth = 'min(88vw, 400px)',
  maxHeight = '90dvh',
  showCloseButton = true,
}: MobileDrawerProps) {
  const isMobile = useIsMobile();
  const resolvedSide: Exclude<DrawerSide, 'auto'> =
    side === 'auto' ? (isMobile ? 'bottom' : 'right') : side;

  const isBottomOrTop = resolvedSide === 'bottom' || resolvedSide === 'top';
  const isBottom = resolvedSide === 'bottom';

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  // Fling or pull the grabber/header down to close, like a native sheet.
  const { ref: dragRef, handlers: dragHandlers } = useDragDismiss({
    onDismiss: close,
    enabled: isBottom,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={dragRef}
        {...dragHandlers}
        side={resolvedSide}
        showCloseButton={showCloseButton}
        className={cn(
          'app-drawer flex flex-col gap-0 p-0',
          isBottomOrTop
            ? 'rounded-t-2xl'
            : 'w-[var(--drawer-max-width)] sm:max-w-none',
          className
        )}
        style={
          {
            maxHeight: isBottomOrTop ? maxHeight : undefined,
            '--drawer-max-width': maxWidth,
          } as React.CSSProperties
        }
      >
        {isBottom && (
          // Generous hit strip around the visible bar: the bar is the cue,
          // the whole strip is the handle.
          <div data-drag-handle className="flex h-5 w-full shrink-0 items-end justify-center" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {(title || description) && (
          <SheetHeader className="border-b px-4 pb-3 pt-4">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div
          className={cn(
            'flex-1 overflow-y-auto px-4 py-4',
            isBottomOrTop && 'pb-[calc(var(--safe-bottom)+1rem)]'
          )}
        >
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              'border-t bg-background/95 backdrop-blur-sm px-4 py-3',
              isBottomOrTop && 'pb-[calc(var(--safe-bottom)+0.75rem)]'
            )}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

