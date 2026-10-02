/**
 * /invitations/accept?id=<invitation id>
 *
 * Lets a person who already has an account join another organization after an
 * invitation (SEC-07). Nothing changes until they confirm here; the server
 * (accept_invitation RPC) re-checks email, expiry, role and the consequences
 * for the organization they leave. Leaving as the sole admin of an
 * organization that still holds data needs a typed confirmation.
 *
 * Rendered outside ProtectedRoute: a signed-out visitor gets a sign-in prompt
 * instead of a silent redirect, and the banner picks the invitation up after
 * login.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, CheckCircle2, Loader2, LogIn, MailPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  acceptInvitation,
  listMyPendingInvitations,
  type AcceptInvitationError,
  type LeaveAssessment,
  type MyPendingInvitation,
} from '@/services/supabase/invitations';
import { ACCEPT_ERROR_KEYS, ROLE_LABEL_KEYS, dataLabelKeys } from '@/components/invitations/invitation-copy';
import { formatDate } from '@/lib/format';

type LoadState = 'loading' | 'ready';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 px-4 py-10 sm:items-center">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  const { t, i18n } = useTranslation('settings');
  const { isAuthenticated, isLoading: authLoading, user, refreshTenant } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedId = params.get('id');

  const [state, setState] = useState<LoadState>('loading');
  const [invitations, setInvitations] = useState<MyPendingInvitation[]>([]);
  const [leave, setLeave] = useState<LeaveAssessment | null>(null);
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AcceptInvitationError | null>(null);
  const [needsTypedConfirm, setNeedsTypedConfirm] = useState(false);
  const [joined, setJoined] = useState<{ tenantName: string; leftTenantDeleted: boolean } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    listMyPendingInvitations().then((res) => {
      if (cancelled) return;
      setInvitations(res.invitations);
      setLeave(res.leave);
      setNeedsTypedConfirm(res.leave?.outcome === 'confirm_required');
      setState('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const selected = useMemo(() => {
    if (requestedId) return invitations.find((i) => i.id === requestedId) ?? null;
    return invitations.length === 1 ? invitations[0] : null;
  }, [invitations, requestedId]);

  const confirmPhrase = (leave?.currentTenantName || '').trim() || 'LEAVE';
  const typedOk = typed.trim() === confirmPhrase;
  const blocked = leave?.outcome === 'promote_admin_first' || leave?.outcome === 'active_subscription';

  const handleAccept = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const res = await acceptInvitation(selected.id, needsTypedConfirm && typedOk);
    setSubmitting(false);

    if (res.status === 'accepted' || res.status === 'already_member') {
      setJoined({
        tenantName: res.tenantName || selected.tenantName,
        leftTenantDeleted: res.status === 'accepted' && res.leftTenantDeleted,
      });
      await refreshTenant();
      return;
    }
    if (res.status === 'confirmation_required') {
      // The organization gained data since the page loaded: ask again.
      setLeave(res.leave ?? leave);
      setNeedsTypedConfirm(true);
      setTyped('');
      return;
    }
    if (res.leave) setLeave(res.leave);
    setError(res.error);
  };

  // Full navigation so every tenant-scoped cache (billing, master data,
  // react-query) starts fresh in the new organization.
  const goToApp = () => window.location.replace('/');

  if (authLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="h-5 w-5" /> {t('Invitation')}
            </CardTitle>
            <CardDescription>
              {t('Sign in with the email address the invitation was sent to. After signing in, you can review the invitation before anything changes.')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" /> {t('Sign in')}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </Shell>
    );
  }

  if (joined) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t('You joined {{tenant}}', { tenant: joined.tenantName })}
            </CardTitle>
            {joined.leftTenantDeleted && (
              <CardDescription>{t('Your previous, empty organization was removed.')}</CardDescription>
            )}
          </CardHeader>
          <CardFooter>
            <Button onClick={goToApp}>{t('Continue to {{tenant}}', { tenant: joined.tenantName })}</Button>
          </CardFooter>
        </Card>
      </Shell>
    );
  }

  if (state === 'loading') {
    return (
      <Shell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  // No usable invitation for this account.
  if (!selected && (requestedId || invitations.length === 0)) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>{t('Invitation not available')}</CardTitle>
            <CardDescription>
              {t('This invitation has expired, was already used or withdrawn, or was sent to a different email address. You are signed in as {{email}}.', { email: user?.email ?? '' })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button variant="outline" asChild>
              <Link to="/">{t('Back to the app')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </Shell>
    );
  }

  // Several invitations and none picked yet.
  if (!selected) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="h-5 w-5" /> {t('Pending invitations')}
            </CardTitle>
            <CardDescription>{t('Choose an invitation to review.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setParams({ id: inv.id })}
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{inv.tenantName}</span>
                <span className="text-muted-foreground">{t(ROLE_LABEL_KEYS[inv.role])}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const dataLabels = dataLabelKeys(leave?.dataTables ?? []);
  const currentName = leave?.currentTenantName || t('your current organization');

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('Join {{tenant}}?', { tenant: selected.tenantName })}
          </CardTitle>
          <CardDescription>
            {selected.invitedByName
              ? t('{{name}} invited you ({{email}}) to join as {{role}}.', {
                  name: selected.invitedByName,
                  email: user?.email ?? '',
                  role: t(ROLE_LABEL_KEYS[selected.role]),
                })
              : t('You ({{email}}) were invited to join as {{role}}.', {
                  email: user?.email ?? '',
                  role: t(ROLE_LABEL_KEYS[selected.role]),
                })}
            {selected.expiresAt && (
              <> {t('Valid until {{date}}.', { date: formatDate(selected.expiresAt, i18n.language) })}</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-medium">{t('What happens when you accept')}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t('An account can belong to one organization at a time. You will leave {{current}} and join {{tenant}}.', { current: currentName, tenant: selected.tenantName })}</li>
              <li>{t('You lose access to the products, documents and other data of {{current}}.', { current: currentName })}</li>
              <li>{t('Your login, password and email address stay the same.')}</li>
              {leave?.outcome === 'delete_empty_tenant' && (
                <li>{t('{{current}} has no data and no other members. It will be deleted.', { current: currentName })}</li>
              )}
            </ul>
          </div>

          {leave?.outcome === 'promote_admin_first' && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>{t('You cannot leave yet')}</AlertTitle>
              <AlertDescription>
                <p>{t(ACCEPT_ERROR_KEYS.promote_admin_first)}</p>
                <Link to="/settings/users" className="underline">{t('Open user management')}</Link>
              </AlertDescription>
            </Alert>
          )}

          {leave?.outcome === 'active_subscription' && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>{t('You cannot leave yet')}</AlertTitle>
              <AlertDescription>
                <p>{t(ACCEPT_ERROR_KEYS.active_subscription)}</p>
                <Link to="/settings/billing" className="underline">{t('Open billing')}</Link>
              </AlertDescription>
            </Alert>
          )}

          {needsTypedConfirm && !blocked && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>{t('You are the only admin of {{current}}', { current: currentName })}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{t('After you leave, nobody can sign in to {{current}} anymore. Its data is not deleted, but it will no longer be accessible. Only support can restore access.', { current: currentName })}</p>
                {dataLabels.length > 0 && (
                  <p>
                    {t('It contains:')} {dataLabels.map((k) => t(k)).join(', ')}
                  </p>
                )}
                <p>{t('If others should keep working with this data, invite them and make one of them an admin first.')}</p>
                <label className="block pt-1 text-foreground">
                  <span className="mb-1 block">
                    {t('Type {{phrase}} to confirm:', { phrase: confirmPhrase })}
                  </span>
                  <Input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    aria-invalid={typed.length > 0 && !typedOk}
                  />
                </label>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertDescription>{t(ACCEPT_ERROR_KEYS[error])}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/">{t('Not now')}</Link>
          </Button>
          <Button
            onClick={handleAccept}
            disabled={submitting || blocked || (needsTypedConfirm && !typedOk)}
            variant={needsTypedConfirm ? 'destructive' : 'default'}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {needsTypedConfirm
              ? t('Leave {{current}} and join', { current: currentName })
              : t('Accept and join {{tenant}}', { tenant: selected.tenantName })}
          </Button>
        </CardFooter>
      </Card>
    </Shell>
  );
}
