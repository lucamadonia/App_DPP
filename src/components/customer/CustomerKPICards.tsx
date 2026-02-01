import { useTranslation } from 'react-i18next';
import { Package, MessageSquare, CreditCard, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CustomerDashboardStats } from '@/types/customer-portal';

interface CustomerKPICardsProps {
  stats: CustomerDashboardStats;
}

export function CustomerKPICards({ stats }: CustomerKPICardsProps) {
  const { t } = useTranslation('customer-portal');

  const cards = [
    {
      label: t('Active Returns'),
      value: stats.activeReturns,
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: t('Open Tickets'),
      value: stats.openTickets,
      icon: MessageSquare,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      label: t('Total Refunds'),
      value: `\u20AC${stats.totalRefunds.toFixed(2)}`,
      icon: CreditCard,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: t('Last Return'),
      value: stats.lastReturnStatus ? t(stats.lastReturnStatus) : '\u2014',
      icon: Activity,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
