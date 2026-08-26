import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/motion';

// ---------------------------------------------------------------------------
// LoadingState — consistent shimmer skeleton wrapper
// ---------------------------------------------------------------------------
interface LoadingStateProps {
  className?: string;
  message?: string;
  lines?: number;
}

export function LoadingState({ className, message, lines = 3 }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-4', className)}>
      <div className="w-full max-w-md space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerSkeleton
            key={i}
            className={cn('h-4 rounded', i === lines - 1 ? 'w-2/3' : 'w-full')}
          />
        ))}
      </div>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorState — destructive feedback with retry
// ---------------------------------------------------------------------------
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation('common');
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: fadeIn, initial: 'initial', animate: 'animate' };

  return (
    <Wrapper
      {...wrapperProps}
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-sm font-semibold mb-1">
        {title || t('Something went wrong')}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        {message || t('An unexpected error occurred. Please try again.')}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          {t('Try again')}
        </Button>
      )}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — unified empty state across the app
// ---------------------------------------------------------------------------
/**
 * Illustration motifs. Seven scenes cover all ~23 empty states — grouped by
 * what the screen is about, not by screen, so related views stay visually
 * related. Each ships a light and a dark file; the dark one is not a filter
 * over the light one but its own render, because the glows have to sit on
 * navy to read.
 */
type EmptyStateMotif =
  | 'packages'
  | 'customers'
  | 'tickets'
  | 'reports'
  | 'workflows'
  | 'settings'
  | 'search';

/**
 * Derived from the icon the caller already passes, so no call site had to
 * change and none can pick a mismatched pair. Icons with no entry keep the
 * plain glyph tile — a deliberate fallback, not an oversight: a new screen
 * renders correctly the moment it is written, and gains an illustration when
 * someone adds a motif here.
 *
 * Keys are Lucide `displayName`s, which are NOT always the name you import:
 * the deprecated aliases resolve to their modern name, so `BarChart3` arrives
 * as `ChartColumn`. When adding an entry, check the actual displayName rather
 * than trusting the import — a wrong key fails silently back to the glyph.
 */
const MOTIF_BY_ICON_NAME: Record<string, EmptyStateMotif> = {
  Package: 'packages',
  PackageOpen: 'packages',
  Box: 'packages',
  Inbox: 'packages',
  Users: 'customers',
  User: 'customers',
  MessageSquareText: 'tickets',
  MessageSquare: 'tickets',
  ChartColumn: 'reports', // imported as BarChart3
  BarChart3: 'reports',
  Zap: 'workflows',
  Settings2: 'settings',
  Settings: 'settings',
  Search: 'search',
  ArrowUpDown: 'search',
};

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
  /**
   * Overrides the motif derived from `icon`. Pass `false` to force the plain
   * icon tile where an illustration would be too loud — dense list views that
   * empty and refill as filters change, for instance.
   */
  illustration?: EmptyStateMotif | false;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
  illustration,
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: fadeIn, initial: 'initial', animate: 'animate' };

  const motif =
    illustration === false
      ? undefined
      : illustration ?? MOTIF_BY_ICON_NAME[(Icon as { displayName?: string }).displayName ?? ''];

  return (
    <Wrapper
      {...wrapperProps}
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      {motif ? (
        // Both files render and CSS picks one, rather than reading the theme
        // in JS: no flash of the wrong artwork on first paint, and it keeps
        // working under whichever dark strategy the app is configured with.
        <>
          <img
            src={`/images/empty-states/${motif}-light.webp`}
            alt=""
            aria-hidden="true"
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="mb-4 h-32 w-32 select-none object-contain dark:hidden"
          />
          <img
            src={`/images/empty-states/${motif}-dark.webp`}
            alt=""
            aria-hidden="true"
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            className="mb-4 hidden h-32 w-32 select-none object-contain dark:block"
          />
        </>
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </Wrapper>
  );
}
