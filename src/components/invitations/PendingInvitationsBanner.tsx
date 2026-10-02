/**
 * Banner for signed-in users who have pending invitations to another
 * organization (accept flow for existing accounts, SEC-07). Links to the
 * AcceptInvitationPage, which explains the consequences before anything
 * changes. Dismissal is per browser session only.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MailPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { listMyPendingInvitations, type MyPendingInvitation } from '@/services/supabase/invitations';
import { ROLE_LABEL_KEYS } from './invitation-copy';

const DISMISS_KEY = 'tb:invitation-banner-dismissed';

function readDismissed(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable (private mode): dismissal just does not persist
  }
}

export function PendingInvitationsBanner() {
  const { t } = useTranslation('settings');
  const { isAuthenticated, tenantId } = useAuth();
  const [invitations, setInvitations] = useState<MyPendingInvitation[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());

  useEffect(() => {
    if (!isAuthenticated || !tenantId) return;
    let cancelled = false;
    listMyPendingInvitations().then((res) => {
      if (!cancelled) setInvitations(res.invitations);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, tenantId]);

  const visible = isAuthenticated ? invitations.filter((i) => !dismissed.includes(i.id)) : [];
  if (visible.length === 0) return null;

  const first = visible[0];
  const dismiss = () => {
    const next = [...dismissed, ...visible.map((i) => i.id)];
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-sm"
    >
      <MailPlus className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {visible.length === 1
          ? t('You have been invited to join {{tenant}} as {{role}}.', {
              tenant: first.tenantName,
              role: t(ROLE_LABEL_KEYS[first.role]),
            })
          : t('You have {{count}} pending invitations to other organizations.', { count: visible.length })}
      </p>
      <div className="flex items-center gap-1">
        <Button asChild size="sm">
          <Link to={visible.length === 1 ? `/invitations/accept?id=${encodeURIComponent(first.id)}` : '/invitations/accept'}>
            {t('Review invitation')}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={dismiss}
          aria-label={t('Hide for now')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
