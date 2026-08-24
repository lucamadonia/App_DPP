import * as React from 'react';
import { cn } from '@/lib/utils';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

type PageContainerSize = 'narrow' | 'default' | 'wide' | 'full';

// `title` is omitted from the DOM attributes: the native HTML `title` is a
// string tooltip, and we need a ReactNode heading. Anything wanting a tooltip
// can still pass it through `className`-level markup.
interface PageContainerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Max-width preset. narrow=3xl, default=7xl, wide=screen-2xl, full=none */
  size?: PageContainerSize;
  /** Opt-in safe-area bottom padding for iOS notched devices */
  bottomSafeArea?: boolean;
  /** Opt-in vertical spacing between direct children (space-y-6 sm:space-y-8) */
  stack?: boolean;
  /** Semantic element override (defaults to div) */
  as?: 'div' | 'section' | 'main' | 'article';
  /**
   * Page title. Large `h1` on mobile, normal heading on desktop. The app header
   * shows a compact copy of the route title independently of this.
   */
  title?: React.ReactNode;
  /** Optional short line under the title. */
  description?: React.ReactNode;
  /** Header actions — inline on desktop, wrapping on mobile. */
  actions?: React.ReactNode;
  /**
   * Primary/destructive actions. Fixed above the tab bar on mobile (via
   * StickyBottomBar), inline at the end of the page on desktop.
   */
  bottomBar?: React.ReactNode;
  /**
   * Enables pull-to-refresh on touch devices. Should resolve once the
   * underlying query has refetched.
   */
  onRefresh?: () => Promise<unknown>;
  /**
   * Set `false` when an ancestor already supplies horizontal padding.
   *
   * `AppLayout`'s `<main>` currently carries `p-4 sm:p-6 pb-app`, so inside the
   * authenticated shell this container must NOT add its own or every page gains
   * a second gutter. Public and portal layouts do not pad, so they leave it on.
   *
   * The end state is for `<main>` to stop padding and for this to own it — but
   * that swap only becomes safe once every page uses this component, otherwise
   * the ~130 pages that do not would lose their padding overnight.
   */
  padding?: boolean;
}

const sizeMap: Record<PageContainerSize, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-screen-2xl',
  full: '',
};

/**
 * The standard page shell.
 *
 * Beyond width and padding it owns three things pages should not hand-roll:
 *  - bottom clearance, so content is never hidden behind the tab bar
 *    (`.pb-app` = safe area + tab-bar height, collapsing to normal padding at md)
 *  - the large mobile title
 *  - the slots for a sticky action bar and pull-to-refresh
 *
 * Pages must not reach for `env(safe-area-*)` themselves — `npm run check:native`
 * fails the build if they do.
 */
export function PageContainer({
  size = 'default',
  bottomSafeArea = false,
  stack = false,
  as: Tag = 'div',
  title,
  description,
  actions,
  bottomBar,
  onRefresh,
  padding = true,
  className,
  children,
  ...rest
}: PageContainerProps) {
  const Component = Tag;

  const body = (
    <Component
      className={cn(
        'mx-auto w-full',
        padding && 'px-4 sm:px-6 lg:px-8',
        sizeMap[size],
        stack && 'space-y-6 sm:space-y-8',
        // A bottom bar reserves its own space; otherwise clear the tab bar.
        bottomBar ? 'pb-app' : bottomSafeArea && 'pb-[calc(var(--safe-bottom)+1rem)]',
        className
      )}
      {...rest}
    >
      {/* Header styling matches what the twelve hand-rolled headers this
          replaced actually did, so consolidating them is not a silent restyle:
          - `font-bold`, not semibold — 11 of the 12 were bold
          - `sm:items-center`, so buttons stay vertically centred against a
            one-line title as before, and only top-align when it wraps
          - no `truncate`: German page titles are long, and clipping one is a
            worse failure than letting it wrap onto two lines */}
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6 sm:items-center">
          <div className="min-w-0">
            {title && (
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight md:text-2xl">
                {title}
              </h1>
            )}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      )}

      {children}

      {bottomBar && <StickyBottomBar>{bottomBar}</StickyBottomBar>}
    </Component>
  );

  if (!onRefresh) return body;

  return <PullToRefresh onRefresh={onRefresh}>{body}</PullToRefresh>;
}
