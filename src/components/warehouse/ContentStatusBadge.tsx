import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CONTENT_STATUS_COLORS } from '@/lib/warehouse-constants';
import type { ContentStatus } from '@/types/warehouse';

interface ContentStatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

export function ContentStatusBadge({ status, className }: ContentStatusBadgeProps) {
  const { t } = useTranslation('warehouse');
  return (
    <Badge className={`${CONTENT_STATUS_COLORS[status] || ''} border-0 ${className || ''}`}>
      {t(status)}
    </Badge>
  );
}
