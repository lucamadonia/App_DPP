import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  FileText,
  Shield,
  Users,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getActivityLog } from '@/services/supabase/activity-log';
import type { ActivityLogEntry } from '@/types/database';
import { relativeTime } from '@/lib/animations';
import { useLocale } from '@/hooks/use-locale';

const ENTITY_STYLE_MAP: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  product: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  document: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  compliance: { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  supplier: { icon: Users, color: 'text-amber-600', bg: 'bg-amber-500/10' },
};

function getEntityStyle(entityType: string) {
  return ENTITY_STYLE_MAP[entityType] || { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' };
}

function getEntityLink(entry: ActivityLogEntry): string | null {
  if (!entry.entityId) return null;
  switch (entry.entityType) {
    case 'product': return `/products/${entry.entityId}`;
    case 'document': return '/documents';
    case 'supplier': return '/suppliers';
    default: return null;
  }
}

function formatAction(entry: ActivityLogEntry, t: (key: string, options?: Record<string, string>) => string): string {
  const action = entry.action;
  const details = entry.details as Record<string, string> | undefined;
  const name = details?.name || details?.productName || '';

  if (action.includes('created') && entry.entityType === 'product') {
    return name ? t('Created product "{{name}}"', { name }) : t('Created a product');
  }
  if (action.includes('updated') && entry.entityType === 'product') {
    return name ? t('Updated product "{{name}}"', { name }) : t('Updated a product');
  }
  if ((action.includes('uploaded') || action.includes('created')) && entry.entityType === 'document') {
    return name ? t('Uploaded document "{{name}}"', { name }) : t('Uploaded a document');
  }
  if (action.includes('deleted')) {
    return name ? t('Deleted "{{name}}"', { name }) : t('Deleted an item');
  }
  // Integration jobs (commerce/shopify sync) log technical action ids.
  if (action.includes('backfill')) {
    return t('Commerce data synced');
  }
  if (action.includes('inventory')) {
    return t('Shopify inventory exported');
  }

  // Fallback: humanize "domain action.step" → "Domain action step"
  const cleaned = action.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getActivityLog({ limit: 8 })
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setIsError(false);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {t('Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-start gap-3">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-6 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Failed to load activity')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setIsLoading(true); setReloadKey((k) => k + 1); }}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {t('Try again')}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t('No recent activity')}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* timeline rail */}
            <div
              aria-hidden
              className="absolute bottom-3 left-[21px] top-3 w-px bg-border"
            />
            <div className="space-y-1">
              {entries.map((entry) => {
                const style = getEntityStyle(entry.entityType);
                const EntityIcon = style.icon;
                const link = getEntityLink(entry);
                const content = (
                  <div className="relative flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
                    <div className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background ${style.bg}`}>
                      <EntityIcon className={`h-3.5 w-3.5 ${style.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {formatAction(entry, t)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(entry.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                );

                return link ? (
                  <Link key={entry.id} to={link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={entry.id}>{content}</div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
