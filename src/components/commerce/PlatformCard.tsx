import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Plug, ChevronRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon } from './PlatformIcon';
import {
  type CommercePlatform,
  type CommerceChannelConnection,
  getPlatformDescriptor,
} from '@/types/commerce-channels';

interface PlatformCardProps {
  platform: CommercePlatform;
  connection?: CommerceChannelConnection;
  /** When true, renders as locked/upgrade-required */
  locked?: boolean;
  onConnect?: () => void;
}

/**
 * Marketing-grade card for the integrations grid.
 * Shows brand, blurb, capability chips, and connect/manage CTA.
 */
export function PlatformCard({ platform, connection, locked, onConnect }: PlatformCardProps) {
  const { t } = useTranslation('commerce');
  const desc = getPlatformDescriptor(platform);
  const hasError = connection?.status === 'error' || connection?.status === 'reauth_required';

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
      data-status={connection?.status || 'available'}
    >
      {/* Gradient ribbon */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 opacity-30 transition-opacity group-hover:opacity-50"
        style={{ background: `linear-gradient(135deg, ${desc.gradient[0]} 0%, ${desc.gradient[1]} 100%)` }}
      />
      <div
        aria-hidden
        className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-10 blur-3xl"
        style={{ background: desc.brandColor }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={platform} size={28} badge />
            <div>
              <h3 className="font-display text-lg font-semibold leading-none">
                {desc.label}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {desc.authMethod === 'oauth2' ? t('OAuth 2.0') : desc.authMethod === 'api_key' ? t('API Key') : desc.authMethod === 'access_token' ? t('Access Token') : t('Manual upload')}
              </p>
            </div>
          </div>
          <StatusBadge connection={connection} locked={locked} available={desc.available} />
        </div>

        {/* Blurb */}
        <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
          {desc.blurb}
        </p>

        {/* Capability chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {desc.capabilities.orders && <Cap label={t('Orders')} />}
          {desc.capabilities.products && <Cap label={t('Products')} />}
          {desc.capabilities.inventory && <Cap label={t('Inventory')} />}
          {desc.capabilities.fulfillment && <Cap label={t('Fulfillment')} />}
          {desc.capabilities.refunds && <Cap label={t('Refunds')} />}
        </div>

        {/* Footer CTA */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          {connection ? (
            <div className="text-xs text-muted-foreground">
              <div className="truncate max-w-[200px] font-medium text-foreground">{connection.accountLabel}</div>
              {connection.lastIncrementalSyncAt && (
                <div className="mt-0.5">
                  {t('Last sync')}: {relTime(connection.lastIncrementalSyncAt)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{desc.scopesRequired.length} {t('scopes')}</span>
          )}
          {locked ? (
            <Link to="/settings/billing" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Lock className="h-3.5 w-3.5" />
              {t('Upgrade')}
            </Link>
          ) : connection ? (
            <Link
              to={`/commerce/channels/${connection.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {hasError ? t('Fix') : t('Manage')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : desc.available ? (
            <button
              type="button"
              onClick={onConnect}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plug className="h-3.5 w-3.5" />
              {t('Connect')}
            </button>
          ) : (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {t('Coming soon')}
            </Badge>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  connection,
  locked,
  available,
}: {
  connection?: CommerceChannelConnection;
  locked?: boolean;
  available: boolean;
}) {
  const { t } = useTranslation('commerce');

  if (locked) {
    return (
      <Badge className="gap-1 border-amber-300/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
        <Lock className="h-3 w-3" />
        {t('Upgrade')}
      </Badge>
    );
  }
  if (!connection) {
    return available ? null : (
      <Badge variant="secondary" className="text-[10px]">{t('Soon')}</Badge>
    );
  }
  if (connection.status === 'connected') {
    return (
      <Badge className="gap-1 border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        {t('Connected')}
      </Badge>
    );
  }
  if (connection.status === 'error' || connection.status === 'reauth_required') {
    return (
      <Badge className="gap-1 border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" />
        {connection.status === 'reauth_required' ? t('Re-auth') : t('Error')}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 capitalize">{connection.status}</Badge>
  );
}

function Cap({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
