import { useState } from 'react';
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

interface ContactSupportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnNumber: string;
}

export function ContactSupportForm({ open, onOpenChange, returnNumber }: ContactSupportFormProps) {
  const { t } = useTranslation('returns');
  const [subject, setSubject] = useState(`Return ${returnNumber}`);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    // Simulate sending - in production this would call a service
    await new Promise(r => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      onOpenChange(false);
      setSent(false);
      setMessage('');
    }, 2000);
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
            <p className="font-medium">{t('Support request sent')}</p>
          </div>
        ) : (
          <div className="space-y-4">
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
              disabled={sending || !message.trim() || !email.trim()}
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
