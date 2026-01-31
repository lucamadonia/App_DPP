import { useTranslation } from 'react-i18next';
import { CreditCard, RefreshCw, Ticket, Wrench } from 'lucide-react';
import type { DesiredSolution } from '@/types/returns-hub';

const SOLUTIONS: Array<{ value: DesiredSolution; labelKey: string; descKey: string; Icon: React.ElementType }> = [
  { value: 'refund', labelKey: 'Refund', descKey: 'Get your money back', Icon: CreditCard },
  { value: 'exchange', labelKey: 'Exchange', descKey: 'Swap for a new item', Icon: RefreshCw },
  { value: 'voucher', labelKey: 'Voucher', descKey: 'Receive store credit', Icon: Ticket },
  { value: 'repair', labelKey: 'Repair', descKey: 'Have the item repaired', Icon: Wrench },
];

interface SolutionStepProps {
  selected: DesiredSolution;
  onSelect: (v: DesiredSolution) => void;
}

export function SolutionStep({ selected, onSelect }: SolutionStepProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Preferred Solution')}</h2>
        <p className="text-sm text-muted-foreground">{t('How would you like to resolve this?')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SOLUTIONS.map(({ value, labelKey, descKey, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`p-5 rounded-xl border-2 text-left transition-all group ${
              selected === value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg mb-3 transition-colors ${
              selected === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:text-foreground'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-medium text-sm">{t(labelKey)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t(descKey)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
