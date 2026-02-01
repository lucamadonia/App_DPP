import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RhCustomer } from '@/types/returns-hub';

interface CustomerGridCardProps {
  customer: RhCustomer;
}

export function CustomerGridCard({ customer }: CustomerGridCardProps) {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;

  const riskColor =
    customer.riskScore >= 70
      ? 'text-red-500 stroke-red-500'
      : customer.riskScore >= 40
      ? 'text-yellow-500 stroke-yellow-500'
      : 'text-green-500 stroke-green-500';

  const riskBg =
    customer.riskScore >= 70
      ? 'bg-red-50'
      : customer.riskScore >= 40
      ? 'bg-yellow-50'
      : 'bg-green-50';

  // SVG ring calculation
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (customer.riskScore / 100) * circumference;

  return (
    <Card
      className="group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={() => navigate(`/returns/customers/${customer.id}`)}
    >
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">{name}</p>
            {customer.company && (
              <p className="text-xs text-muted-foreground truncate">{customer.company}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
          </div>

          {/* Risk Score Ring */}
          <div className={`relative flex items-center justify-center shrink-0 rounded-full ${riskBg} p-1`}>
            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
              <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`${riskColor} transition-all duration-700`}
              />
            </svg>
            <span className={`absolute text-xs font-bold ${riskColor}`}>{customer.riskScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
          <div className="text-center flex-1">
            <p className="text-sm font-bold">{customer.returnStats.totalReturns}</p>
            <p className="text-[10px] text-muted-foreground">{t('Returns')}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-bold">{'\u20AC'}{customer.returnStats.totalValue.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">{t('Total Value')}</p>
          </div>
        </div>

        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {customer.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
