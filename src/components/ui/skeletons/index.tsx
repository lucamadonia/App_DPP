import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface BaseSkeletonProps {
  className?: string;
}

/** List-page skeleton: toolbar + table rows / mobile cards */
export function ListSkeleton({
  rows = 6,
  className,
}: BaseSkeletonProps & { rows?: number }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Detail-page skeleton: header, two-column content, side panel */
export function DetailSkeleton({ className }: BaseSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Form skeleton: stacked input rows with label */
export function FormSkeleton({
  fields = 6,
  className,
}: BaseSkeletonProps & { fields?: number }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/** KPI-row skeleton: responsive card grid */
export function KPIRowSkeleton({
  count = 4,
  className,
}: BaseSkeletonProps & { count?: number }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

/** Card-grid skeleton for dashboard sections */
export function CardGridSkeleton({
  cards = 3,
  className,
}: BaseSkeletonProps & { cards?: number }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}
