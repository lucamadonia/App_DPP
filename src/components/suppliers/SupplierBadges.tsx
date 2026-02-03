import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, CheckCircle2, BadgeCheck, AlertCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SupplierRiskBadge({ level }: { level: string }) {
  const { t } = useTranslation('settings');
  switch (level) {
    case 'high':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('High')}
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3" />
          {t('Medium')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          {t('Low')}
        </Badge>
      );
  }
}

export function SupplierStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('settings');
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('Active')}</Badge>;
    case 'inactive':
      return <Badge variant="secondary">{t('Inactive')}</Badge>;
    case 'blocked':
      return <Badge variant="destructive">{t('Blocked')}</Badge>;
    case 'pending_approval':
      return <Badge className="bg-yellow-100 text-yellow-800">{t('Pending Approval')}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SupplierComplianceBadge({ status }: { status?: string }) {
  const { t } = useTranslation('settings');
  switch (status) {
    case 'compliant':
      return <Badge className="bg-green-100 text-green-800"><BadgeCheck className="h-3 w-3 mr-1" />{t('Compliant')}</Badge>;
    case 'non_compliant':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{t('Non-Compliant')}</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('Review Pending')}</Badge>;
  }
}

export function StarRating({ rating, size = 'sm' }: { rating?: number; size?: 'sm' | 'md' }) {
  if (!rating) return <span className="text-muted-foreground">-</span>;
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${iconSize} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}
