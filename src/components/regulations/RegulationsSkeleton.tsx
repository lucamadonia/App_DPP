import { useTranslation } from 'react-i18next';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/** Mirrors the real layout so nothing jumps when data arrives. */
export function RegulationsSkeleton() {
  const { t } = useTranslation('common');
  return (
    <div className="min-w-0 space-y-6" role="status" aria-busy="true" aria-label={t('Loading...')}>
      <div className="space-y-2">
        <ShimmerSkeleton className="h-8 w-60 max-w-full" />
        <ShimmerSkeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ShimmerSkeleton className="h-52 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ShimmerSkeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <ShimmerSkeleton className="h-11 w-full max-w-md rounded-lg" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ShimmerSkeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
