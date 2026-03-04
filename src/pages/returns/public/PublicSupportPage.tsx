import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { createPublicReturnTicket } from '@/services/supabase';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { sendTicketCreatedEvent } from '@/lib/embed-messaging';

export function PublicSupportPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const { tenantSlug, tenantName, primaryColor } = useReturnsPortal();
  const { isEmbed } = useEmbedMode();
  const portalPath = isEmbed ? `/embed/portal/${tenantSlug}` : `/returns/portal/${tenantSlug}`;

  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        returnNumber: returnNumber.trim() || undefined,
      });

      if (result.success && result.ticketNumber) {
        setTicketNumber(result.ticketNumber);
        setSent(true);
        if (isEmbed) {
          sendTicketCreatedEvent(result.ticketNumber);
        }
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

  const handleReset = () => {
    setSent(false);
    setTicketNumber('');
    setEmail('');
    setSubject('');
    setMessage('');
    setReturnNumber('');
    setError('');
  };

  return (
    <div className="animate-fade-in-up">
      {/* Back to Portal */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(portalPath)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Overview')}
        </button>
      </div>

      {/* Hero Section */}
      <section
        className="py-12 sm:py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}05 100%)` }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white mx-auto mb-4"
            style={{ backgroundColor: primaryColor }}
          >
            <MessageCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t('Welcome to {{name}} Support', { name: tenantName || t('Returns Hub') })}
          </h1>
          <p className="text-muted-foreground">
            {t('How can we help you?')}
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="max-w-xl mx-auto px-4 -mt-4 relative z-10 pb-12">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {sent ? (
              <div className="py-8 text-center animate-scale-in">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold mb-1">{t('Ticket created!')}</h2>
                {ticketNumber && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('Ticket number')}: <span className="font-mono font-semibold">{ticketNumber}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  {t('We will get back to you soon.')}
                </p>
                <Button variant="outline" onClick={handleReset}>
                  {t('Send another message')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('Email Address')}</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Subject')}</Label>
                  <Input
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('How can we help you?')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Message')}</Label>
                  <Textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('Describe your issue...')}
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Return Number (optional)')}</Label>
                  <Input
                    value={returnNumber}
                    onChange={(e) => setReturnNumber(e.target.value)}
                    placeholder="RET-20260304-..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending || !message.trim() || !email.trim() || !subject.trim()}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('Send Request')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
