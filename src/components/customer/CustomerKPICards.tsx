import { useTranslation } from 'react-i18next';
import { Package, MessageSquare, CreditCard, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import type { CustomerDashboardStats } from '@/types/customer-portal';

interface CustomerKPICardsProps {
  stats: CustomerDashboardStats;
}

const CARD_CONFIGS = [
  {
    key: 'activeReturns',
    icon: Package,
    gradientFrom: '#3B82F6',
    gradientTo: '#60A5FA',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'openTickets',
    icon: MessageSquare,
    gradientFrom: '#F97316',
    gradientTo: '#FB923C',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    key: 'totalRefunds',
    icon: CreditCard,
    gradientFrom: '#10B981',
    gradientTo: '#34D399',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'lastReturn',
    icon: Activity,
    gradientFrom: '#8B5CF6',
    gradientTo: '#A78BFA',
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
];

export function CustomerKPICards({ stats }: CustomerKPICardsProps) {
  const { t } = useTranslation('customer-portal');
  const { branding } = useCustomerPortal();

  const cards = [
    {
      label: t('Active Returns'),
      value: stats.activeReturns,
      ...CARD_CONFIGS[0],
    },
    {
      label: t('Open Tickets'),
      value: stats.openTickets,
      ...CARD_CONFIGS[1],
    },
    {
      label: t('Total Refunds'),
      value: `\u20AC${stats.totalRefunds.toFixed(2)}`,
      ...CARD_CONFIGS[2],
    },
    {
      label: t('Last Return'),
      value: stats.lastReturnStatus ? t(stats.lastReturnStatus) : '\u2014',
      ...CARD_CONFIGS[3],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: branding.cardBackground }}
        >
          <CardContent className="pt-4 pb-4 relative">
            {/* Subtle gradient accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${card.gradientFrom}, ${card.gradientTo})` }}
            />
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
