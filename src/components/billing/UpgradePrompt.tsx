/**
 * UpgradePrompt — Contextual upgrade/purchase prompt.
 *
 * Shows a specific message based on what's blocking the user,
 * with a direct action button.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PromptVariant = 'quota' | 'module' | 'credits' | 'feature';

interface UpgradePromptProps {
  variant: PromptVariant;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  inline?: boolean;
}

export function UpgradePrompt({
  variant,
  message,
  actionLabel,
  onAction,
  className,
  inline = false,
}: UpgradePromptProps) {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();

  const defaultAction = () => navigate('/settings/billing');
  const handleAction = onAction || defaultAction;
  const label = actionLabel || t('View Plans');

  const Icon = {
    quota: AlertTriangle,
    module: Lock,
    credits: Sparkles,
    feature: Lock,
  }[variant];

  const bgColor = {
    quota: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    module: 'bg-muted border-border',
    credits: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    feature: 'bg-muted border-border',
  }[variant];

  const iconColor = {
    quota: 'text-amber-600 dark:text-amber-400',
    module: 'text-muted-foreground',
    credits: 'text-purple-600 dark:text-purple-400',
    feature: 'text-muted-foreground',
  }[variant];

  if (inline) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
        <span className="text-muted-foreground">{message}</span>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={handleAction}>
          {label}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border p-4',
      bgColor,
      className,
    )}>
      <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />
      <p className="flex-1 text-sm">{message}</p>
      <Button size="sm" onClick={handleAction}>
        {label}
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
