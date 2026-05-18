import { useTranslation } from 'react-i18next';
import { HelpCircle, AlertTriangle, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LookupState } from '@/pages/returns/public/PublicReturnRegisterPage';

// Fallback support email when the portal branding doesn't carry one yet.
// Tenants can override by setting tenants.settings.returnsHub.supportEmail.
const DEFAULT_SUPPORT_EMAIL = 'support@fambliss.de';

interface IdentificationStepProps {
  orderNumber: string;
  email: string;
  lookupState: LookupState;
  onOrderNumberChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

export function IdentificationStep({
  orderNumber,
  email,
  lookupState,
  onOrderNumberChange,
  onEmailChange,
}: IdentificationStepProps) {
  const { t } = useTranslation('returns');
  const supportEmail = DEFAULT_SUPPORT_EMAIL;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Identification')}</h2>
        <p className="text-sm text-muted-foreground">{t('Enter your order number and email')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="order-number">{t('Order Number')}</Label>
          <Input
            id="order-number"
            value={orderNumber}
            onChange={(e) => onOrderNumberChange(e.target.value)}
            placeholder="#1234"
            autoFocus
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">{t('No order number?')}</p>
              <p>{t('Check your confirmation email or account for the order number')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('Email Address')}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {lookupState === 'miss' && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 px-4 py-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                  {t('lookup_miss_title')}
                </p>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                  {t('lookup_miss_help')}
                </p>
              </div>
            </div>
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                t('Question about my order'),
              )}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-900 dark:text-rose-200 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {supportEmail}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
