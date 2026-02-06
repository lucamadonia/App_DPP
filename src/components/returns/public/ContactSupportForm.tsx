import { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPublicReturnTicket } from '@/services/supabase';
import { ReturnsPortalContext } from '@/pages/returns/public/ReturnsPortalLayout';

interface ContactSupportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnNumber: string;
  tenantSlug?: string; // Optional - will use context if not provided
}

export function ContactSupportForm({ open, onOpenChange, returnNumber, tenantSlug: propTenantSlug }: ContactSupportFormProps) {
  const { t } = useTranslation('returns');
  const context = useContext(ReturnsPortalContext);
  const tenantSlug = propTenantSlug || context?.tenantSlug;

  const [subject, setSubject] = useState(`Return ${returnNumber}`);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !subject.trim() || !message.trim()) return;
    if (!tenantSlug) {
      setError(t('Portal not found'));
      return;
    }

    setSending(true);
    setError('');

    try {
      const result = await createPublicReturnTicket({
        tenantSlug,
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        returnNumber,
      });

      if (result.success && result.ticketNumber) {
        setTicketNumber(result.ticketNumber);
        setSent(true);
        setTimeout(() => {
          onOpenChange(false);
          setSent(false);
          setMessage('');
          setSubject(`Return ${returnNumber}`);
          setEmail('');
          setTicketNumber('');
        }, 3000);
      } else {
        setError(result.error || t('An unexpected error occurred. Please try again.'));
      }
    } catch (err) {
      console.error('Error creating support ticket:', err);
      setError(t('Failed to create support ticket. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Contact Support')}</DialogTitle>
          <DialogDescription>{t('Need help with your return?')}</DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto mb-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium">{t('Ticket created!')}</p>
            {ticketNumber && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('Ticket number')}: <span className="font-mono font-semibold">{ticketNumber}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{t('We will get back to you soon.')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('Email Address')}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Subject')}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Message')}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('Describe your issue...')}
                rows={4}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={sending || !message.trim() || !email.trim() || !subject.trim()}
              className="w-full"
            >
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Send Request')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
