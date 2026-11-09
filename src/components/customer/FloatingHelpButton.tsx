import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircleQuestion, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { createCustomerTicket } from '@/services/supabase/customer-portal';

export function FloatingHelpButton() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, branding, portalSettings } = useCustomerPortal();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Don't show if ticket creation is disabled
  if (!portalSettings.features.createTickets) return null;

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    const result = await createCustomerTicket({
      subject: `[${category}] ${subject}`,
      message,
    });
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setSubject('');
        setMessage('');
        setCategory('general');
        if (result.id) {
          navigate(`/customer/${tenantSlug}/tickets/${result.id}`);
        }
      }, 1500);
    }
  };

  const primaryColor = branding.primaryColor;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(1.5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg hover:shadow-xl transition-[scale,box-shadow] duration-200 ease-out hover:scale-105 active:scale-95"
          style={{ backgroundColor: primaryColor }}
          title={t('Need help?')}
          aria-label={t('Need help?')}
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </button>
      )}

      {/* Slide-out panel */}
      {open && (
        <div className="fixed bottom-[calc(1rem+var(--safe-bottom))] right-[calc(1rem+var(--safe-right))] sm:bottom-[calc(1.5rem+var(--safe-bottom))] sm:right-[calc(1.5rem+var(--safe-right))] z-50 w-[calc(100vw-2rem-var(--safe-left)-var(--safe-right))] max-w-96 max-h-[calc(100dvh-2rem-var(--safe-top)-var(--safe-bottom))] flex flex-col rounded-xl shadow-2xl border overflow-hidden animate-fade-in-up" style={{ backgroundColor: branding.cardBackground }}>
          {/* Header */}
          <div
            className="shrink-0 pl-4 pr-1.5 py-1.5 flex items-center justify-between text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5" />
              <span className="font-medium text-sm">{t('Need help?')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
              aria-label={t('Close', { ns: 'common' })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 overflow-y-auto overscroll-contain">
            {submitted ? (
              <div className="text-center py-6 space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full mx-auto bg-green-100">
                  <Send className="h-5 w-5 text-green-600" />
                </div>
                <p className="font-medium">{t('Ticket created!')}</p>
                <p className="text-xs text-muted-foreground">{t('We will get back to you soon.')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('General')}</SelectItem>
                      <SelectItem value="return_issue">{t('Return Issue')}</SelectItem>
                      <SelectItem value="account">{t('Account')}</SelectItem>
                      <SelectItem value="other">{t('Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Subject')}</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('Brief description of your issue')}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Message')}</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('Describe your issue in detail...')}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !subject.trim() || !message.trim()}
                  className="w-full gap-2"
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('Create Ticket')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
