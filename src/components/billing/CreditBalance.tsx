/**
 * CreditBalance — Displays AI credit balance with monthly/purchased breakdown.
 *
 * Can be used inline (compact) or as a full card.
 */

import { useTranslation } from 'react-i18next';
import { Sparkles, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CreditBalance as CreditBalanceType } from '@/types/billing';

// ============================================
// Compact Header Display
// ============================================

interface CreditBadgeProps {
  credits: CreditBalanceType;
  onClick?: () => void;
  className?: string;
}

export function CreditBadge({ credits, onClick, className }: CreditBadgeProps) {
  const isLow = credits.totalAvailable <= 3 && credits.totalAvailable > 0;
  const isEmpty = credits.totalAvailable === 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
        'hover:bg-accent',
        isEmpty && 'text-destructive',
        isLow && 'text-amber-600 dark:text-amber-400',
        !isEmpty && !isLow && 'text-muted-foreground',
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="tabular-nums">{credits.totalAvailable}</span>
      <span className="hidden sm:inline">Credits</span>
    </button>
  );
}

// ============================================
// Full Credit Card
// ============================================

interface CreditBalanceCardProps {
  credits: CreditBalanceType;
  onPurchase: () => void;
  className?: string;
}

export function CreditBalanceCard({ credits, onPurchase, className }: CreditBalanceCardProps) {
  const { t } = useTranslation('billing');
  const monthlyRemaining = Math.max(0, credits.monthlyAllowance - credits.monthlyUsed);
  const monthlyPct = credits.monthlyAllowance > 0
    ? (credits.monthlyUsed / credits.monthlyAllowance) * 100
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('AI Credits')}
          </CardTitle>
          <span className="text-2xl font-bold tabular-nums">{credits.totalAvailable}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly credits */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('Monthly Credits')}</span>
            <span className="font-medium tabular-nums">
              {credits.monthlyUsed} / {credits.monthlyAllowance} {t('used')}
            </span>
          </div>
          <Progress
            value={monthlyPct}
            className={cn(
              'h-2',
              monthlyPct >= 100 && '[&>div]:bg-destructive',
              monthlyPct >= 80 && monthlyPct < 100 && '[&>div]:bg-amber-500',
            )}
          />
          <p className="text-xs text-muted-foreground">
            {monthlyRemaining > 0
              ? t('{{count}} monthly credits remaining', { count: monthlyRemaining })
              : t('Monthly credits used up')}
          </p>
        </div>

        {/* Purchased credits */}
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
          <div>
            <p className="text-sm font-medium">{t('Purchased Credits')}</p>
            <p className="text-xs text-muted-foreground">{t('Never expire')}</p>
          </div>
          <span className="text-lg font-bold tabular-nums">{credits.purchasedBalance}</span>
        </div>

        <Button onClick={onPurchase} variant="outline" className="w-full">
          <ShoppingCart className="mr-2 h-4 w-4" />
          {t('Buy Credits')}
        </Button>
      </CardContent>
    </Card>
  );
}
