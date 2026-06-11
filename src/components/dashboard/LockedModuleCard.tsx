import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Sparkles, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LockedModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

/** Subtle teaser for modules the tenant has not booked yet. */
export function LockedModuleCard({ title, description, icon: Icon, className }: LockedModuleCardProps) {
  const { t } = useTranslation('dashboard');
  return (
    <Card className={cn('h-full border-dashed bg-card/40', className)}>
      <CardContent className="flex h-full flex-col items-start gap-3 p-5">
        <div className="flex w-full items-center justify-between">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <Icon className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <Lock className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
        </div>
        <Button variant="outline" size="sm" className="mt-auto" asChild>
          <Link to="/settings/billing">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {t('Upgrade')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
