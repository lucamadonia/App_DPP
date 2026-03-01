import { useTranslation } from 'react-i18next';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloorMapBreadcrumbProps {
  locationName: string;
  zoneName?: string;
  onBackToOverview: () => void;
}

export function FloorMapBreadcrumb({
  locationName,
  zoneName,
  onBackToOverview,
}: FloorMapBreadcrumbProps) {
  const { t } = useTranslation('warehouse');

  if (!zoneName) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={onBackToOverview}
      >
        <ArrowLeft className="h-3 w-3" />
        {t('Back to Overview')}
      </Button>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-xs truncate max-w-[120px]">{locationName}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
          {zoneName}
        </span>
      </div>
    </div>
  );
}
