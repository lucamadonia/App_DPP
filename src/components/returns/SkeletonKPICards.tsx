import { Card, CardContent } from '@/components/ui/card';

interface SkeletonKPICardsProps {
  count?: number;
}

export function SkeletonKPICards({ count = 7 }: SkeletonKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4 px-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-5 bg-muted rounded w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
