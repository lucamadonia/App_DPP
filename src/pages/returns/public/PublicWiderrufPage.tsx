import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, Undo2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabaseAnon } from '@/lib/supabase';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';

/**
 * §356a BGB "Widerrufsbutton" — dedicated, login-free, two-step withdrawal
 * declaration (mandatory from 2026-06-19). Deliberately minimal: name, order
 * number, email — NO mandatory reason, NO multi-step returns wizard. On
 * confirm it calls the `widerruf-request` edge function, which records the
 * declaration with a server-authoritative timestamp and always sends the
 * acknowledgement-of-receipt email.
 */

type Lang = 'de' | 'en';
type Step = 'form' | 'confirm' | 'done';

const COPY: Record<Lang, {
  heading: string;
  intro: string;
  name: string;
  orderNumber: string;
  email: string;
  step1Cta: string;          // "Vertrag widerrufen"
  confirmTitle: string;
  confirmNotice: string;     // binding-declaration notice
  confirmCta: string;        // "Widerruf bestätigen"
  back: string;
  submitting: string;
  doneTitle: string;
  doneReceipt: string;
  doneReference: string;
  doneMail: string;
  error: string;
}> = {
  de: {
    heading: 'Vertrag widerrufen',
    intro: 'Gib deine Bestellnummer und E-Mail-Adresse an, um deinen Vertrag zu widerrufen. Eine Begründung ist nicht erforderlich.',
    name: 'Name',
    orderNumber: 'Bestellnummer',
    email: 'E-Mail-Adresse',
    step1Cta: 'Vertrag widerrufen',
    confirmTitle: 'Widerruf bestätigen',
    confirmNotice: 'Mit Klick auf „Widerruf bestätigen" widerrufst du den unten genannten Vertrag verbindlich. Du erhältst anschließend eine Eingangsbestätigung per E-Mail.',
    confirmCta: 'Widerruf bestätigen',
    back: 'Zurück',
    submitting: 'Wird übermittelt …',
    doneTitle: 'Wir haben deinen Widerruf erhalten',
    doneReceipt: 'Dein Widerruf ist bei uns eingegangen. Wir prüfen ihn und melden uns bei dir.',
    doneReference: 'Vorgangsnummer',
    doneMail: 'Eine Eingangsbestätigung mit Datum und Uhrzeit ist an deine E-Mail-Adresse unterwegs.',
    error: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
  },
  en: {
    heading: 'Withdraw from contract',
    intro: 'Enter your order number and email address to withdraw from your contract. No reason is required.',
    name: 'Name',
    orderNumber: 'Order number',
    email: 'Email address',
    step1Cta: 'Withdraw from contract',
    confirmTitle: 'Confirm withdrawal',
    confirmNotice: 'By clicking "Confirm withdrawal" you bindingly withdraw from the contract below. You will then receive an acknowledgement of receipt by email.',
    confirmCta: 'Confirm withdrawal',
    back: 'Back',
    submitting: 'Submitting …',
    doneTitle: 'We have received your withdrawal',
    doneReceipt: 'Your withdrawal has reached us. We will review it and get back to you.',
    doneReference: 'Reference',
    doneMail: 'An acknowledgement of receipt with date and time is on its way to your email address.',
    error: 'Something went wrong. Please try again.',
  },
};

export function PublicWiderrufPage() {
  const { i18n } = useTranslation('returns');
  const { tenantSlug, tenantName, primaryColor } = useReturnsPortal();
  const lang: Lang = i18n.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
  const t = COPY[lang];
  const accent = primaryColor || '#909c8c';

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const canProceed = orderNumber.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return;
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!tenantSlug) {
      setError(t.error);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data, error: fnError } = await supabaseAnon.functions.invoke('widerruf-request', {
        body: {
          order_number: orderNumber.trim(),
          email: email.trim(),
          name: name.trim() || undefined,
          tenant_slug: tenantSlug,
          lang,
        },
      });
      const result = data as { success?: boolean; reference?: string } | null;
      if (fnError || !result?.success) {
        setError(t.error);
        return;
      }
      setReference(result.reference || '');
      setStep('done');
    } catch (err) {
      console.error('[widerruf] submit failed:', err);
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <section
        className="py-12 sm:py-16"
        style={{ background: `linear-gradient(135deg, ${accent}10 0%, ${accent}05 100%)` }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white mx-auto mb-4"
            style={{ backgroundColor: accent }}
          >
            <Undo2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{t.heading}</h1>
          {tenantName && <p className="text-sm text-muted-foreground">{tenantName}</p>}
        </div>
      </section>

      <section className="max-w-xl mx-auto px-4 -mt-4 relative z-10 pb-12">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            {/* Step 1 — minimal declaration form */}
            {step === 'form' && (
              <form onSubmit={handleStep1} className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.intro}</p>
                <div className="space-y-2">
                  <Label>{t.name}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label>{t.orderNumber} *</Label>
                  <Input
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="#1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.email} *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" disabled={!canProceed} className="w-full" style={{ backgroundColor: accent }}>
                  {t.step1Cta}
                </Button>
              </form>
            )}

            {/* Step 2 — binding confirmation */}
            {step === 'confirm' && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </button>

                <h2 className="text-lg font-semibold">{t.confirmTitle}</h2>

                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                  {name.trim() && <div><span className="text-muted-foreground">{t.name}:</span> {name.trim()}</div>}
                  <div><span className="text-muted-foreground">{t.orderNumber}:</span> <span className="font-mono">{orderNumber.trim()}</span></div>
                  <div><span className="text-muted-foreground">{t.email}:</span> {email.trim()}</div>
                </div>

                <div className="flex gap-2 items-start rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{t.confirmNotice}</p>
                </div>

                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full"
                  style={{ backgroundColor: accent }}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {submitting ? t.submitting : t.confirmCta}
                </Button>
              </div>
            )}

            {/* Step 3 — acknowledgement of receipt */}
            {step === 'done' && (
              <div className="py-8 text-center animate-scale-in">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold mb-1">{t.doneTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t.doneReceipt}</p>
                {reference && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {t.doneReference}: <span className="font-mono font-semibold">{reference}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">{t.doneMail}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
