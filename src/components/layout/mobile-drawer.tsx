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
  maxHeight = '90vh',
  showCloseButton = true,
}: MobileDrawerProps) {
  const isMobile = useIsMobile();
  const resolvedSide: Exclude<DrawerSide, 'auto'> =
    side === 'auto' ? (isMobile ? 'bottom' : 'right') : side;

  const isBottomOrTop = resolvedSide === 'bottom' || resolvedSide === 'top';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={resolvedSide}
        showCloseButton={showCloseButton}
        className={cn(
          'flex flex-col gap-0 p-0',
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
        {isBottomOrTop && resolvedSide === 'bottom' && (
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden="true" />
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
            isBottomOrTop && 'pb-[calc(env(safe-area-inset-bottom)+1rem)]'
          )}
        >
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              'border-t bg-background/95 backdrop-blur-sm px-4 py-3',
              isBottomOrTop && 'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]'
            )}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

