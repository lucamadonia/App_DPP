import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Building2, AlertTriangle } from 'lucide-react';
import type { RhCustomer } from '@/types/returns-hub';

interface CustomerCardProps {
  customer: RhCustomer;
  compact?: boolean;
}

export function CustomerCard({ customer, compact }: CustomerCardProps) {
  const { t } = useTranslation('returns');

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
  const riskColor = customer.riskScore >= 70 ? 'text-red-600' : customer.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600';
  const riskBg = customer.riskScore >= 70 ? 'bg-red-50' : customer.riskScore >= 40 ? 'bg-yellow-50' : 'bg-green-50';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
        </div>
        {customer.riskScore > 0 && (
          <Badge variant="outline" className={`${riskBg} ${riskColor}`}>
            {customer.riskScore}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{fullName}</CardTitle>
          {customer.riskScore > 0 && (
            <div className={`flex items-center gap-1 ${riskColor}`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{t('Risk Score')}: {customer.riskScore}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{customer.email}</span>
        </div>
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.company && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{customer.company}</span>
          </div>
        )}
        <div className="flex gap-4 pt-2 border-t text-sm">
          <div>
            <span className="text-muted-foreground">{t('Total Returns')}:</span>{' '}
            <span className="font-medium">{customer.returnStats.totalReturns}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('Total Value')}:</span>{' '}
            <span className="font-medium">€{customer.returnStats.totalValue.toFixed(2)}</span>
          </div>
        </div>
        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
