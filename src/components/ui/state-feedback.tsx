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
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: fadeIn, initial: 'initial', animate: 'animate' };

  return (
    <Wrapper
      {...wrapperProps}
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
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
