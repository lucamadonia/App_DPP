import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }, (_, i) => (
          <ShimmerSkeleton key={i} className="h-4 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: columns }, (_, c) => (
            <ShimmerSkeleton
              key={c}
              className={`h-4 rounded flex-1 ${c === 0 ? 'max-w-[120px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
