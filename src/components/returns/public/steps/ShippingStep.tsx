import { useTranslation } from 'react-i18next';
import { Printer, QrCode, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const METHODS = [
  { value: 'print_label', labelKey: 'Print Label', descKey: 'Print a prepaid shipping label', Icon: Printer },
  { value: 'qr_code', labelKey: 'QR Code', descKey: 'Show a QR code at the drop-off point', Icon: QrCode },
  { value: 'pickup', labelKey: 'Pickup', descKey: 'Schedule a pickup at your address', Icon: MapPin },
];

export interface ShippingAddress {
  name: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

interface ShippingStepProps {
  selected: string;
  onSelect: (v: string) => void;
  address: ShippingAddress;
  onAddressChange: (address: ShippingAddress) => void;
}

export function ShippingStep({ selected, onSelect, address, onAddressChange }: ShippingStepProps) {
  const { t } = useTranslation('returns');

  const update = (field: keyof ShippingAddress, value: string) => {
    onAddressChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* Address Section */}
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Your Address')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('We need your address to create a return shipping label')}</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="shipping-name">{t('Full Name')} *</Label>
            <Input
              id="shipping-name"
              value={address.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('Full Name')}
            />
          </div>

          <div>
            <Label htmlFor="shipping-company">{t('Company (optional)')}</Label>
            <Input
              id="shipping-company"
              value={address.company}
              onChange={(e) => update('company', e.target.value)}
              placeholder={t('Company (optional)')}
            />
          </div>

          <div>
            <Label htmlFor="shipping-street">{t('Street')} *</Label>
            <Input
              id="shipping-street"
              value={address.street}
              onChange={(e) => update('street', e.target.value)}
              placeholder={t('Street')}
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <Label htmlFor="shipping-postal">{t('Postal Code')} *</Label>
              <Input
                id="shipping-postal"
                value={address.postalCode}
                onChange={(e) => update('postalCode', e.target.value)}
                placeholder={t('Postal Code')}
              />
            </div>
            <div>
              <Label htmlFor="shipping-city">{t('City')} *</Label>
              <Input
                id="shipping-city"
                value={address.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder={t('City')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="shipping-country">{t('Country')} *</Label>
            <Input
              id="shipping-country"
              value={address.country}
              onChange={(e) => update('country', e.target.value)}
              placeholder={t('Country')}
            />
          </div>
        </div>
      </div>

      {/* Shipping Method Section */}
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Shipping Method')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('How would you like to ship?')}</p>

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
    </div>
  );
}
