/**
 * Supplier Registration Success Page
 * Displayed after successful supplier registration submission
 */

import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSupplierPortal } from '@/hooks/useSupplierPortal';

export function SupplierRegisterSuccessPage() {
  const { t } = useTranslation('supplier-portal');
  const { portalSettings, tenantName } = useSupplierPortal();

  const handleClose = () => {
    // Close the tab/window
    window.close();
  };

  const successMessage = portalSettings.successMessage || t(
    'Thank you for registering! Your information has been received and will be reviewed by our team. You will be notified once your supplier account is approved.'
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Card className="overflow-hidden">
        <CardContent className="pt-10 pb-8 text-center relative">
          {/* Confetti animation */}
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
            {t('Registration Submitted Successfully!')}
          </h2>

          <p className="text-muted-foreground mb-6 whitespace-pre-line">
            {successMessage}
          </p>

          {/* Next steps */}
          <div className="text-left bg-muted/50 rounded-xl p-5 space-y-3 mb-6">
            <p className="font-semibold text-sm">{t('What happens next?')}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>{t('Your registration will be reviewed by {{company}}', { company: tenantName })}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>{t('You will receive an email notification once your account is approved')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>{t('After approval, you will be able to access the supplier portal')}</span>
              </li>
            </ul>
          </div>

          {/* Close button */}
          <Button
            className="w-full"
            onClick={handleClose}
          >
            {t('Close')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
