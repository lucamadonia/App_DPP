import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  AlertTriangle,
  Clock,
  Shield,
  Globe,
  Leaf,
  Banknote,
} from 'lucide-react';
import type { SupplyChainEntry } from '@/types/database';
import type { LucideIcon } from 'lucide-react';

interface SupplyChainStatsProps {
  entries: SupplyChainEntry[];
}

interface StatCard {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel: string;
  gradient: string;
  iconColor: string;
  valueColor?: string;
}

export function SupplyChainStats({ entries }: SupplyChainStatsProps) {
  const { t } = useTranslation('settings');

  const stats = useMemo(() => {
    const total = entries.length;
    const highRisk = entries.filter(e => e.risk_level === 'high').length;
    const mediumRisk = entries.filter(e => e.risk_level === 'medium').length;
    const verified = entries.filter(e => e.verified).length;
    const countries = new Set(entries.map(e => e.country)).size;
    const totalEmissions = entries.reduce((sum, e) => sum + (e.emissions_kg || 0), 0);
    const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0);

    return { total, highRisk, mediumRisk, verified, countries, totalEmissions, totalCost };
  }, [entries]);

  const cards: StatCard[] = [
    {
      icon: Package,
      label: t('Total Steps'),
      value: stats.total,
      sublabel: t('Supply Chain Steps'),
      gradient: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-600',
    },
    {
      icon: AlertTriangle,
      label: t('High Risk'),
      value: stats.highRisk,
      sublabel: t('Entries'),
      gradient: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
    },
    {
      icon: Clock,
      label: t('Medium Risk'),
      value: stats.mediumRisk,
      sublabel: t('Entries'),
      gradient: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-600',
    },
    {
      icon: Shield,
      label: t('Verified'),
      value: stats.verified,
      sublabel: t('of {{total}}', { total: stats.total }),
      gradient: 'bg-gradient-to-br from-green-500/10 to-green-600/5',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      icon: Globe,
      label: t('Countries'),
      value: stats.countries,
      sublabel: t('involved'),
      gradient: 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/5',
      iconColor: 'text-indigo-600',
      valueColor: 'text-indigo-600',
    },
    {
      icon: Leaf,
      label: t('Total Emissions'),
      value: stats.totalEmissions.toFixed(1),
      sublabel: t('kg CO₂'),
      gradient: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      icon: Banknote,
      label: t('Total Cost'),
      value: `${stats.totalCost.toFixed(0)} €`,
      sublabel: t('Entries'),
      gradient: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`animate-in fade-in rounded-xl border p-4 ${card.gradient}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
              <span className="text-sm font-medium text-muted-foreground truncate">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.valueColor || ''}`}>
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
