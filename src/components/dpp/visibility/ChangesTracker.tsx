/**
 * Changes Tracker Component
 *
 * Shows diff of unsaved changes with revert option.
 */

import { Undo2, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FieldChange {
  field: string;
  category: string;
  label: string;
  level: 'consumer' | 'customs';
  from: boolean;
  to: boolean;
}

interface ChangesTrackerProps {
  changes: FieldChange[];
  onRevert: (change: FieldChange) => void;
}

export function ChangesTracker({ changes, onRevert }: ChangesTrackerProps) {
  const { t } = useTranslation('dpp');

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Undo2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('No unsaved changes')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {changes.length} {t('unsaved changes')}
        </span>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2 pr-4">
          {changes.map((change, index) => {
            const Icon = change.level === 'consumer' ? Users : ShieldCheck;
            const color = change.level === 'consumer' ? 'text-green-600' : 'text-amber-600';

            return (
              <div
                key={`${change.field}-${change.level}-${index}`}
                className="border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t(change.label)}</div>
                    <div className="text-xs text-muted-foreground">{change.category}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevert(change)}
                    className="h-7 w-7 p-0 shrink-0"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                  <Badge variant={change.from ? 'default' : 'outline'} className="h-5 px-1.5">
                    {change.from ? t('ON') : t('OFF')}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant={change.to ? 'default' : 'outline'} className="h-5 px-1.5">
                    {change.to ? t('ON') : t('OFF')}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
