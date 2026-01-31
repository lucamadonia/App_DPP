import { useTranslation } from 'react-i18next';
import { Pencil, Package, MessageSquare, Camera, Lightbulb, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DesiredSolution } from '@/types/returns-hub';
import type { WizardItem } from './SelectItemsStep';

interface ConfirmationStepProps {
  orderNumber: string;
  email: string;
  items: WizardItem[];
  reasonCategory: string;
  reasonSubcategory: string;
  reasonText: string;
  solution: DesiredSolution;
  shippingMethod: string;
  photoCount: number;
  onGoToStep: (step: number) => void;
}

function SectionCard({
  title,
  icon: Icon,
  step,
  onGoToStep,
  children,
}: {
  title: string;
  icon: React.ElementType;
  step: number;
  onGoToStep: (step: number) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('returns');
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onGoToStep(step)}
          className="text-xs h-7 px-2"
        >
          <Pencil className="h-3 w-3 mr-1" />
          {t('Change')}
        </Button>
      </div>
      {children}
    </div>
  );
}

const solutionLabels: Record<DesiredSolution, string> = {
  refund: 'Refund',
  exchange: 'Exchange',
  voucher: 'Voucher',
  repair: 'Repair',
};

const shippingLabels: Record<string, string> = {
  print_label: 'Print Label',
  qr_code: 'QR Code',
  pickup: 'Pickup',
};

export function ConfirmationStep({
  orderNumber,
  email,
  items,
  reasonCategory,
  reasonSubcategory,
  reasonText,
  solution,
  shippingMethod,
  photoCount,
  onGoToStep,
}: ConfirmationStepProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Review Your Return')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('I confirm that the information above is correct')}
        </p>
      </div>

      <div className="space-y-3">
        {/* Order & Contact */}
        <SectionCard title={t('Order & Contact')} icon={Package} step={0} onGoToStep={onGoToStep}>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>{t('Order Number')}: <span className="text-foreground font-medium">{orderNumber || '—'}</span></p>
            <p>{t('Email')}: <span className="text-foreground font-medium">{email}</span></p>
          </div>
        </SectionCard>

        {/* Items */}
        <SectionCard title={t('Items')} icon={Package} step={1} onGoToStep={onGoToStep}>
          <div className="text-sm space-y-1">
            {items.filter(i => i.name.trim()).map((item, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span className="text-foreground">{item.name}</span>
                <span>x{item.quantity} &middot; {t(item.condition === 'like_new' ? 'Like New' : item.condition.charAt(0).toUpperCase() + item.condition.slice(1))}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Reason */}
        <SectionCard title={t('Reason')} icon={MessageSquare} step={2} onGoToStep={onGoToStep}>
          <div className="text-sm text-muted-foreground space-y-1">
            {reasonCategory && <p>{t('Category')}: <span className="text-foreground font-medium">{reasonCategory}</span></p>}
            {reasonSubcategory && <p>{t('Subcategory')}: <span className="text-foreground">{reasonSubcategory}</span></p>}
            {reasonText && <p className="text-foreground">{reasonText}</p>}
          </div>
        </SectionCard>

        {/* Photos */}
        <SectionCard title={t('Photos')} icon={Camera} step={3} onGoToStep={onGoToStep}>
          <p className="text-sm text-muted-foreground">
            {t('{{count}} photos selected', { count: photoCount })}
          </p>
        </SectionCard>

        {/* Solution */}
        <SectionCard title={t('Solution')} icon={Lightbulb} step={4} onGoToStep={onGoToStep}>
          <p className="text-sm font-medium">{t(solutionLabels[solution])}</p>
        </SectionCard>

        {/* Shipping */}
        <SectionCard title={t('Shipping')} icon={Truck} step={5} onGoToStep={onGoToStep}>
          <p className="text-sm font-medium">{t(shippingLabels[shippingMethod] || shippingMethod)}</p>
        </SectionCard>
      </div>
    </div>
  );
}
