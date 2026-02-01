interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className="h-4 bg-muted rounded flex-1"
              style={{ maxWidth: c === 0 ? '120px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
