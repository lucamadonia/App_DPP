import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RefreshCw, type LucideIcon } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  icon: LucideIcon;
  /** "View all" link target shown in the header */
  to: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Icon tint, e.g. "text-rose-400" */
  accentClassName?: string;
  /** Extra header content (badges, live dots) rendered next to the title */
  headerExtra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Generic glass shell shared by all dashboard module widgets. */
export function ModuleCard({
  title,
  icon: Icon,
  to,
  isLoading,
  isError,
  onRetry,
  accentClassName = 'text-primary',
  headerExtra,
  className,
  children,
}: ModuleCardProps) {
  const { t } = useTranslation('dashboard');
  return (
    <GlassCard className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <Icon className={cn('h-4 w-4 shrink-0', accentClassName)} />
            <span className="truncate">{title}</span>
            {headerExtra}
          </CardTitle>
          <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" asChild>
            <Link to={to}>
              {t('View All', { ns: 'common' })}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-lg bg-muted" />
              <div className="h-12 rounded-lg bg-muted" />
            </div>
            <div className="h-8 rounded bg-muted" />
          </div>
        ) : isError ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{t('Failed to load data')}</p>
            {onRetry && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {t('Try again')}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </GlassCard>
  );
}

interface MiniStatProps {
  label: string;
  value: number | string;
  sublabel?: string;
  accentClassName?: string;
  animated?: boolean;
}

/** Flat label/value pair used inside module cards (lighter than full KPI cards). */
export function MiniStat({ label, value, sublabel, accentClassName, animated = true }: MiniStatProps) {
  return (
    <div className="min-w-0">
      <div className={cn('text-xl font-bold tabular-nums tracking-tight sm:text-2xl', accentClassName)}>
        {typeof value === 'number' && animated ? <AnimatedCounter value={value} /> : value}
      </div>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {sublabel && <p className="truncate text-[10px] text-muted-foreground/70">{sublabel}</p>}
    </div>
  );
}

export function MiniStatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)}>{children}</div>;
}
