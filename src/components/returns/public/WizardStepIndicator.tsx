import { useTranslation } from 'react-i18next';
import { User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck, Check } from 'lucide-react';

const STEP_ICONS = [User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck];

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function WizardStepIndicator({ currentStep, totalSteps, labels }: WizardStepIndicatorProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="w-full">
      {/* Desktop: full labels */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        {/* Progress line fill */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
        />

        {Array.from({ length: totalSteps }, (_, i) => {
          const Icon = STEP_ICONS[i] || ClipboardCheck;
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;

          return (
            <div key={i} className="flex flex-col items-center relative z-10" style={{ width: `${100 / totalSteps}%` }}>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-white border-primary text-primary ring-4 ring-primary/20'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`mt-2 text-xs text-center leading-tight ${
                  isCurrent ? 'font-semibold text-foreground' : isCompleted ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(labels[i])}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: icons only with step counter */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t(labels[currentStep])}</span>
          <span className="text-xs text-muted-foreground">
            {t('Step {{current}} of {{total}}', { current: currentStep + 1, total: totalSteps })}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
