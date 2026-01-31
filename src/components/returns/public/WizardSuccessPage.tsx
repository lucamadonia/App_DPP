import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Mail, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WizardSuccessPageProps {
  returnNumber: string;
  tenantSlug: string;
}

export function WizardSuccessPage({ returnNumber, tenantSlug }: WizardSuccessPageProps) {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(returnNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Card className="overflow-hidden">
        <CardContent className="pt-10 pb-8 text-center relative">
          {/* Confetti pseudo-elements via CSS */}
          <div className="absolute inset-x-0 top-0 h-2 overflow-hidden">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="absolute animate-confetti-fall"
                style={{
                  left: `${8 + i * 8}%`,
                  animationDelay: `${i * 0.1}s`,
                  width: '6px',
                  height: '6px',
                  borderRadius: i % 2 === 0 ? '50%' : '0',
                  backgroundColor: ['#3B82F6', '#16A34A', '#D97706', '#EC4899', '#8B5CF6', '#06B6D4'][i % 6],
                }}
              />
            ))}
          </div>

          {/* Animated check icon */}
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse-ring" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-scale-in">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 animate-fade-in-up">
            {t('Return Submitted Successfully!')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('Your return has been registered and is being processed.')}
          </p>

          {/* Return number */}
          <div className="bg-muted rounded-xl p-5 mb-6">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('Your Return Number')}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-mono font-bold text-primary">{returnNumber}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-8 w-8 p-0"
                title={t('Copy to clipboard')}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-1 animate-scale-in">{t('Copied!')}</p>
            )}
          </div>

          {/* Next steps */}
          <div className="text-left bg-muted/50 rounded-xl p-5 space-y-4 mb-6">
            <p className="font-semibold text-sm">{t('What happens next?')}</p>
            {[
              { Icon: Mail, title: t('Confirmation email sent'), desc: t('You will receive an email with all return details') },
              { Icon: Package, title: t('Prepare your package'), desc: t('Pack the items securely and attach the label') },
              { Icon: Truck, title: t('Ship it back'), desc: t('Drop off your package at the nearest shipping point') },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <step.Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => navigate(`/returns/track/${returnNumber}`)}
            >
              {t('Track This Return')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/returns/portal/${tenantSlug}`)}
            >
              {t('Back to Portal')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
