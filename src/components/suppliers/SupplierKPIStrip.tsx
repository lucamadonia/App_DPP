import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Clock, Shield, AlertTriangle, Globe, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
import type { Supplier } from '@/types/database';

interface SupplierKPIStripProps {
  suppliers: Supplier[];
}

interface KpiItem {
  labelKey: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  valueClass: string;
}

/** KPI strip: Total, Active, Pending Approval, Verified, High Risk, Countries */
export function SupplierKPIStrip({ suppliers }: SupplierKPIStripProps) {
  const { t } = useTranslation('settings');
  const prefersReduced = useReducedMotion();

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    pendingApproval: suppliers.filter(s => s.status === 'pending_approval').length,
    verified: suppliers.filter(s => s.verified).length,
    highRisk: suppliers.filter(s => s.risk_level === 'high').length,
    countries: new Set(suppliers.map(s => s.country)).size,
  }), [suppliers]);

  const items: KpiItem[] = [
    { labelKey: 'Total', value: stats.total, icon: Building2, iconClass: 'text-muted-foreground', valueClass: 'text-foreground' },
    { labelKey: 'Active', value: stats.active, icon: CheckCircle2, iconClass: 'text-emerald-600', valueClass: 'text-emerald-600' },
    { labelKey: 'Approval', value: stats.pendingApproval, icon: Clock, iconClass: 'text-amber-600', valueClass: 'text-amber-600' },
    { labelKey: 'Verified', value: stats.verified, icon: Shield, iconClass: 'text-blue-600', valueClass: 'text-blue-600' },
    { labelKey: 'High Risk', value: stats.highRisk, icon: AlertTriangle, iconClass: 'text-destructive', valueClass: 'text-destructive' },
    { labelKey: 'Countries', value: stats.countries, icon: Globe, iconClass: 'text-purple-600', valueClass: 'text-purple-600' },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 sm:gap-4"
      variants={prefersReduced ? undefined : gridStagger}
      initial={prefersReduced ? undefined : 'initial'}
      animate={prefersReduced ? undefined : 'animate'}
    >
      {items.map(item => {
        const Icon = item.icon;
        return (
          <motion.div key={item.labelKey} variants={prefersReduced ? undefined : gridItem}>
            <Card className="h-full">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.iconClass}`} />
                  <span className="text-sm font-medium truncate">{t(item.labelKey)}</span>
                </div>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${item.valueClass}`}>
                  <AnimatedCounter value={item.value} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
