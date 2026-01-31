import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IdentificationStepProps {
  orderNumber: string;
  email: string;
  onOrderNumberChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

export function IdentificationStep({ orderNumber, email, onOrderNumberChange, onEmailChange }: IdentificationStepProps) {
  const { t } = useTranslation('returns');

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
            placeholder="ORD-..."
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
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>
    </div>
  );
}
