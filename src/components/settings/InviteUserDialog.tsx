import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

  const handleSubmit = async () => {
    if (!email) return;
    setIsSubmitting(true);
    setError(null);

    const result = await createInvitation({ email, role, name: name || undefined, message: message || undefined });

    if (result.success) {
      setEmail('');
      setRole('viewer');
      setName('');
      setMessage('');
      onOpenChange(false);
      onInvited();
    } else {
      setError(result.error || t('Failed to send invitation'));
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('Invite User')}
          </DialogTitle>
          <DialogDescription>
            {t('Send an invitation to join your organization')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Email')} *</label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Role')} *</label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    {t('Admin')}
                  </div>
                </SelectItem>
                <SelectItem value="editor">{t('Editor')}</SelectItem>
                <SelectItem value="viewer">{t('Viewer')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(ROLE_DESCRIPTIONS[role])}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Name')} ({t('optional')})</label>
            <Input
              placeholder={t('Full name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Personal Message')} ({t('optional')})</label>
            <textarea
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t('Add a personal message to the invitation...')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
