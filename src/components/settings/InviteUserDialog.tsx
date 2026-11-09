import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, Loader2, Info, PenLine, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { Textarea } from '@/components/ui/textarea';
import { FormField, ChoiceCards, OptionalDisclosure } from '@/components/ui/form-layout';
import { createInvitation } from '@/services/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

const ROLE_DESCRIPTIONS = {
  admin: 'Full access to all features including settings and user management',
  editor: 'Can create, edit and manage products, documents, and supply chain',
  viewer: 'Read-only access to all data and reports',
};

export function InviteUserDialog({ open, onOpenChange, onInvited }: Props) {
  const { t } = useTranslation('settings');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) return;
    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    const result = await createInvitation({ email, role, name: name || undefined, message: message || undefined });

    if (result.success) {
      // invite-user answers identically for new and existing accounts (no
      // account-existence oracle), so the dialog shows one neutral message.
      // People who already have an account get a link to review and accept
      // the invitation; they only join after confirming it themselves.
      setInfo(t('Invitation sent. The person will receive an email. If they already have a Trackbliss account, they sign in and confirm the invitation before they join.'));

      setEmail('');
      setRole('viewer');
      setName('');
      setMessage('');

      // Show the notice briefly before closing
      setTimeout(() => {
        onOpenChange(false);
        onInvited();
        setInfo(null);
      }, 3000);
    } else {
      setError(result.error ? t(result.error, result.errorParams) : t('Failed to send invitation'));
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('Invite User')}
          </DialogTitle>
          <DialogDescription>
            {t('Send an invitation to join your organization')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <FormField label={t('Email')} htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label={t('Role')} required>
            <ChoiceCards
              value={role}
              onValueChange={(v) => setRole(v)}
              columns={1}
              options={[
                { value: 'admin' as const, label: t('Admin'), description: t(ROLE_DESCRIPTIONS.admin), icon: Shield },
                { value: 'editor' as const, label: t('Editor'), description: t(ROLE_DESCRIPTIONS.editor), icon: PenLine },
                { value: 'viewer' as const, label: t('Viewer'), description: t(ROLE_DESCRIPTIONS.viewer), icon: Eye },
              ]}
            />
          </FormField>

          <OptionalDisclosure
            filledCount={[name, message].filter(Boolean).length}
            description={`${t('Name')}, ${t('Personal Message')}`}
          >
            <FormField label={t('Name')} htmlFor="invite-name" optional>
              <Input
                id="invite-name"
                autoComplete="off"
                placeholder={t('Full name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label={t('Personal Message')} htmlFor="invite-message" optional>
              <Textarea
                id="invite-message"
                rows={3}
                placeholder={t('Add a personal message to the invitation...')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </FormField>
          </OptionalDisclosure>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 text-pretty">{error}</span>
            </div>
          )}

          {info && (
            <div role="status" className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 text-pretty">{info}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSubmit} disabled={!email || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Send Invitation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
