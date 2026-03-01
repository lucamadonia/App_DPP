import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_STATUS_COLORS } from '@/lib/warehouse-constants';
import type { SampleStatus } from '@/types/warehouse';

interface SampleStatusBadgeProps {
  status: SampleStatus;
  className?: string;
}

export function SampleStatusBadge({ status, className }: SampleStatusBadgeProps) {
  const { t } = useTranslation('warehouse');
  return (
    <Badge className={`${SAMPLE_STATUS_COLORS[status] || ''} border-0 ${className || ''}`}>
      {t(status)}
    </Badge>
  );
}
