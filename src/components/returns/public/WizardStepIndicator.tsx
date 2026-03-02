import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck, Check } from 'lucide-react';

const STEP_ICONS = [User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck];

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function WizardStepIndicator({ currentStep, totalSteps, labels }: WizardStepIndicatorProps) {
  const { t } = useTranslation('returns');
  const prefersReduced = useReducedMotion();

  return (
    <div className="w-full">
      {/* Desktop: full labels */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        {/* Progress line fill */}
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-primary"
          animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
        />

        {Array.from({ length: totalSteps }, (_, i) => {
          const Icon = STEP_ICONS[i] || ClipboardCheck;
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;

          return (
            <div key={i} className="flex flex-col items-center relative z-10" style={{ width: `${100 / totalSteps}%` }}>
              <div className="relative">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-white border-primary text-primary'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {/* Animated ring for current step */}
                {isCurrent && !prefersReduced && (
                  <motion.div
                    layoutId="wizard-active-ring"
                    className="absolute inset-[-4px] rounded-full border-2 border-primary/30"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
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
            <motion.div
              key={i}
              className="flex-1 h-1.5 rounded-full"
              animate={{
                backgroundColor: i <= currentStep
                  ? 'hsl(var(--primary))' : 'rgb(229 231 235)',
              }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
