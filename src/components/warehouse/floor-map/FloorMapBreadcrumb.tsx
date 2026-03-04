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
    <div className="flex items-center gap-1 sm:gap-1.5 text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 sm:px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        onClick={onBackToOverview}
      >
        <ArrowLeft className="h-3 w-3" />
        <span className="hidden sm:inline">{t('Back to Overview')}</span>
      </Button>
      <div className="flex items-center gap-1 text-muted-foreground min-w-0">
        <span className="text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]">{locationName}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-[10px] sm:text-xs font-semibold text-foreground truncate max-w-[100px] sm:max-w-[160px]">
          {zoneName}
        </span>
      </div>
    </div>
  );
}
