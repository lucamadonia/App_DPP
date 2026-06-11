import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Package, FileWarning, QrCode, TrendingUp } from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function QuickActionsCard({ hasProducts, className }: { hasProducts: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const prefersReduced = useReducedMotion();

  const actions = [
    { to: '/products/new', icon: Package, label: t('Create Product'), color: 'text-primary', bg: 'bg-primary/10' },
    { to: '/documents', icon: FileWarning, label: t('Documents', { ns: 'common' }), color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { to: '/dpp/qr-generator', icon: QrCode, label: t('Create QR Code'), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { to: '/regulations', icon: TrendingUp, label: t('Regulations', { ns: 'common' }), color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <GlassCard className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle>{t('Quick Start')}</CardTitle>
        <CardDescription>
          {hasProducts ? t('Frequently used features') : t('Get started with DPP Manager')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <motion.div
              key={action.to}
              whileHover={prefersReduced ? undefined : { scale: 1.04, y: -2 }}
              transition={spring.bouncy}
            >
              <Button variant="outline" className="group h-auto w-full flex-col gap-2 p-4" asChild>
                <Link to={action.to}>
                  <span className={`rounded-lg p-2 ${action.bg}`}>
                    <action.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${action.color}`} />
                  </span>
                  <span className="text-xs">{action.label}</span>
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </GlassCard>
  );
}
