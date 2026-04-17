import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface BulkAction {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  onRun: () => void | Promise<void>;
  /** Disable if a condition is not met */
  disabled?: boolean;
  /** Custom render (replaces default button rendering) */
  render?: (compact: boolean) => React.ReactNode;
}

interface BulkActionsBarProps {
  /** Number of currently-selected items */
  count: number;
  /** Called to clear selection */
  onClear: () => void;
  /** Available actions */
  actions: BulkAction[];
  /** Optional label override (defaults to "{{count}} selected") */
  label?: React.ReactNode;
  className?: string;
}

/**
 * Desktop: inline bar with label + actions in a row.
 * Mobile: fixed bottom bar with count + "Actions" button → bottom sheet.
 * Hides itself when count === 0.
 */
export function BulkActionsBar({
  count,
  onClear,
  actions,
  label,
  className,
}: BulkActionsBarProps) {
  const { t } = useTranslation('common');
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (count === 0) return null;

  const resolvedLabel = label ?? t('{{count}} selected', { count });

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-md',
            'flex items-center justify-between gap-3 px-4 py-3',
            'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
            'md:hidden z-40',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              aria-label={t('Clear selection')}
              className="touch-target"
            >
              <X className="size-4" />
            </Button>
            <span className="text-sm font-medium">{resolvedLabel}</span>
          </div>
          <Button onClick={() => setDrawerOpen(true)} size="sm">
            <MoreVertical className="size-4 mr-1" />
            {t('Actions')}
          </Button>
        </div>
        <MobileDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={resolvedLabel}
          side="bottom"
        >
          <div className="flex flex-col gap-2">
            {actions.map((action) =>
              action.render ? (
                <React.Fragment key={action.id}>{action.render(false)}</React.Fragment>
              ) : (
                <Button
                  key={action.id}
                  variant={action.variant ?? 'outline'}
                  disabled={action.disabled}
                  onClick={async () => {
                    await action.onRun();
                    setDrawerOpen(false);
                  }}
                  className="justify-start h-12"
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              )
            )}
          </div>
        </MobileDrawer>
      </>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2 mr-auto">
        <Button variant="ghost" size="icon" onClick={onClear} className="size-8" aria-label={t('Clear selection')}>
          <X className="size-4" />
        </Button>
        <span className="text-sm font-medium">{resolvedLabel}</span>
      </div>
      {actions.map((action) =>
        action.render ? (
          <React.Fragment key={action.id}>{action.render(true)}</React.Fragment>
        ) : (
          <Button
            key={action.id}
            variant={action.variant ?? 'outline'}
            size="sm"
            disabled={action.disabled}
            onClick={() => action.onRun()}
          >
            {action.icon}
            {action.icon && <span className="ml-1.5">{action.label}</span>}
            {!action.icon && action.label}
          </Button>
        )
      )}
    </div>
  );
}
