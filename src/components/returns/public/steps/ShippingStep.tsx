import { useTranslation } from 'react-i18next';
import { Printer, QrCode, MapPin } from 'lucide-react';

const METHODS = [
  { value: 'print_label', labelKey: 'Print Label', descKey: 'Print a prepaid shipping label', Icon: Printer },
  { value: 'qr_code', labelKey: 'QR Code', descKey: 'Show a QR code at the drop-off point', Icon: QrCode },
  { value: 'pickup', labelKey: 'Pickup', descKey: 'Schedule a pickup at your address', Icon: MapPin },
];

interface ShippingStepProps {
  selected: string;
  onSelect: (v: string) => void;
}

export function ShippingStep({ selected, onSelect }: ShippingStepProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Shipping')}</h2>
        <p className="text-sm text-muted-foreground">{t('How would you like to ship?')}</p>
      </div>

      <div className="space-y-3">
        {METHODS.map(({ value, labelKey, descKey, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 group ${
              selected === value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg shrink-0 transition-colors ${
              selected === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:text-foreground'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{t(labelKey)}</p>
              <p className="text-sm text-muted-foreground">{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
