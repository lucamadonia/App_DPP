import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SuccessStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface WarehouseSuccessAnimationProps {
  title: string;
  subtitle: string;
  steps: SuccessStep[];
  primaryAction: { label: string; onClick: () => void };
  secondaryAction: { label: string; onClick: () => void };
  summaryItems?: { label: string; value: string }[];
}

const CONFETTI_COLORS = ['#3B82F6', '#16A34A', '#D97706', '#EC4899', '#8B5CF6', '#06B6D4'];

export function WarehouseSuccessAnimation({
  title,
  subtitle,
  steps,
  primaryAction,
  secondaryAction,
  summaryItems,
}: WarehouseSuccessAnimationProps) {
  const { t } = useTranslation('warehouse');

  return (
    <div className="max-w-lg mx-auto py-4 sm:py-8 px-2 sm:px-0">
      <Card className="overflow-hidden">
        <CardContent className="pt-8 sm:pt-10 pb-6 sm:pb-8 px-4 sm:px-6 text-center relative">
          {/* Confetti */}
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
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                }}
              />
            ))}
          </div>

          {/* Animated check icon */}
          <div className="relative mx-auto mb-4 sm:mb-6 w-16 h-16 sm:w-20 sm:h-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-pulse-ring" />
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-green-100 animate-scale-in">
              <svg className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 animate-fade-in-up">{title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">{subtitle}</p>

          {/* Summary items */}
          {summaryItems && summaryItems.length > 0 && (
            <div className="bg-muted rounded-xl px-3 py-3 sm:p-4 mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
              {summaryItems.map((item, i) => (
                <div key={i} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Next steps */}
          <div className="text-left bg-muted/50 rounded-xl px-3 py-3 sm:p-5 space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <p className="font-semibold text-xs sm:text-sm">{t('What happens next?')}</p>
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 sm:gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <step.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium">{step.title}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <Button className="w-full" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
            <Button variant="outline" className="w-full" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
