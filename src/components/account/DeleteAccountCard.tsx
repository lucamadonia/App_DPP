/**
 * Danger Zone — in-app account deletion.
 *
 * Required by Apple App Store guideline 5.1.1(v): an app that offers account
 * creation must let the user delete that account from inside the app.
 *
 * Shared by the tenant settings page and the customer portal profile page —
 * the account type is resolved from the session, not from a prop, so neither
 * caller can ask for the wrong kind of deletion.
 *
 * The confirmation gate is the `confirmed` flag below: the destructive button
 * stays disabled until the typed address matches the signed-in email exactly
 * (trimmed, case-insensitive).
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getAccountDeletionEligibility,
  requestAccountDeletion,
  type AccountDeletionEligibility,
} from '@/services/supabase/auth';

interface DeleteAccountCardProps {
  /**
   * Where to send the browser once the account is gone. A full page load is
   * used deliberately: every auth/branding/billing context in memory refers to
   * a user that no longer exists.
   */
  redirectTo: string;
}

export function DeleteAccountCard({ redirectTo }: DeleteAccountCardProps) {
  const { t } = useTranslation('common');

  const [eligibility, setEligibility] = useState<AccountDeletionEligibility | null>(null);
  const [open, setOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAccountDeletionEligibility().then((result) => {
      if (!cancelled) setEligibility(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const email = eligibility?.email || '';
  const confirmed = email.length > 0 && typedEmail.trim().toLowerCase() === email.toLowerCase();

  const errorMessage = useCallback(
    (code: string): string => {
      switch (code) {
        case 'last_admin':
          return t('You are the last administrator of this organisation. Assign the administrator role to another user before deleting your account.');
        case 'email_mismatch':
          return t('The email address does not match.');
        case 'no_account':
          return t('No account was found for this session.');
        default:
          return t('The account could not be deleted. Please try again or contact support.');
      }
    },
    [t]
  );

  const handleOpenChange = (next: boolean) => {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setTypedEmail('');
      setError(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError(null);

    const result = await requestAccountDeletion(typedEmail);

    if (result.success) {
      // The service already signed the session out.
      window.location.href = redirectTo;
      return;
    }

    setError(errorMessage(result.error || 'delete_failed'));
    setDeleting(false);
  };

  if (!eligibility) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t('Danger Zone')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ShimmerSkeleton className="h-10 w-56 rounded" />
        </CardContent>
      </Card>
    );
  }

  const isCustomer = eligibility.accountType === 'customer';
  // Valid session, no profile row: an earlier deletion failed partway through.
  // The only thing left to remove is the login itself.
  const isOrphaned = eligibility.accountType === null;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {t('Danger Zone')}
        </CardTitle>
        <CardDescription>
          {t('Permanently delete your account and the personal data linked to it.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eligibility.blockedReason === 'last_admin' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t('You are the last administrator of this organisation. Assign the administrator role to another user before deleting your account.')}
          </div>
        )}
        {eligibility.blockedReason === 'no_account' && (
          <div className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
            {t('No account was found for this session.')}
          </div>
        )}

        <Button
          variant="destructive"
          className="w-full gap-2 sm:w-auto"
          disabled={!eligibility.canDelete}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          {t('Delete Account')}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('Delete Account')}</DialogTitle>
            <DialogDescription>
              {t('This cannot be undone. Please read carefully what happens to your data.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isOrphaned && (
              <div className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
                {t('Your profile data has already been removed. Only the login itself is left, and deleting it completes the process.')}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t('What is deleted')}</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                <li>{t('Your login and your password')}</li>
                {isOrphaned ? null : isCustomer ? (
                  <>
                    <li>{t('Your portal profile: name, phone number and saved addresses')}</li>
                    <li>{t('Your access to the customer portal')}</li>
                  </>
                ) : (
                  <>
                    <li>{t('Your user profile: name, email address and avatar')}</li>
                    <li>{t('Your access to this organisation')}</li>
                  </>
                )}
              </ul>
            </div>

            {!isOrphaned && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('What is retained')}</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                {isCustomer ? (
                  <li>{t('Returns, refunds and invoices are retained because of statutory retention periods. They are anonymised and can no longer be traced back to you.')}</li>
                ) : (
                  <>
                    <li>{t('Products, passports, documents and returns belong to the organisation and remain in place.')}</li>
                    <li>{t('Audit log entries are retained for compliance reasons.')}</li>
                  </>
                )}
              </ul>
            </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm">
                {t('Type {{email}} to confirm.', { email })}
              </Label>
              <Input
                id="delete-account-confirm"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={email}
                value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)}
                disabled={deleting}
              />
            </div>
          </div>

          {/*
            `DialogFooter` is `flex-col-reverse gap-2` below `sm`, which puts the
            destructive button directly above Cancel with 8px between them. Widen
            that to 24px on mobile only — a mis-tap here is the one place in the
            flow where the two outcomes are opposites. Desktop layout unchanged.
          */}
          <DialogFooter className="gap-6 sm:gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!confirmed || deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? t('Deleting...') : t('Delete permanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
