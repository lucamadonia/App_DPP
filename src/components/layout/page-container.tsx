import * as React from 'react';
import { cn } from '@/lib/utils';

type PageContainerSize = 'narrow' | 'default' | 'wide' | 'full';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max-width preset. narrow=3xl, default=7xl, wide=screen-2xl, full=none */
  size?: PageContainerSize;
  /** Opt-in safe-area bottom padding for iOS notched devices */
  bottomSafeArea?: boolean;
  /** Opt-in vertical spacing between direct children (space-y-6 sm:space-y-8) */
  stack?: boolean;
  /** Semantic element override (defaults to div) */
  as?: 'div' | 'section' | 'main' | 'article';
}

const sizeMap: Record<PageContainerSize, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-screen-2xl',
  full: '',
};

/**
 * Standardized page body wrapper with responsive horizontal padding,
 * optional stacking, and optional iOS safe-area bottom padding.
 *
 * Replaces hand-rolled `container mx-auto px-4` patterns across ~8 pages.
 */
export function PageContainer({
  size = 'default',
  bottomSafeArea = false,
  stack = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: PageContainerProps) {
  const Component = Tag;
  return (
    <Component
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeMap[size],
        stack && 'space-y-6 sm:space-y-8',
        bottomSafeArea && 'pb-[calc(env(safe-area-inset-bottom)+1rem)]',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
