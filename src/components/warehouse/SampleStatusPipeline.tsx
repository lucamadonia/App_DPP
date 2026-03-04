import { useTranslation } from 'react-i18next';
import { Package, Camera, RotateCcw, CheckCircle, Gift } from 'lucide-react';
import type { SampleStatus, SampleType } from '@/types/warehouse';

const PIPELINE_STEPS: { status: SampleStatus; icon: typeof Package; color: string }[] = [
  { status: 'distributed', icon: Package, color: 'text-blue-500' },
  { status: 'awaiting_content', icon: Camera, color: 'text-amber-500' },
  { status: 'content_received', icon: CheckCircle, color: 'text-green-500' },
  { status: 'return_pending', icon: RotateCcw, color: 'text-orange-500' },
  { status: 'returned', icon: CheckCircle, color: 'text-slate-500' },
];

const GIFT_PIPELINE_STEPS: { status: SampleStatus; icon: typeof Package; color: string }[] = [
  { status: 'distributed', icon: Gift, color: 'text-blue-500' },
  { status: 'awaiting_content', icon: Camera, color: 'text-amber-500' },
  { status: 'content_received', icon: CheckCircle, color: 'text-green-500' },
  { status: 'kept', icon: Gift, color: 'text-purple-500' },
];

interface SampleStatusPipelineProps {
  currentStatus: SampleStatus;
  sampleType: SampleType;
}

export function SampleStatusPipeline({ currentStatus, sampleType }: SampleStatusPipelineProps) {
  const { t } = useTranslation('warehouse');
  const steps = sampleType === 'gift' ? GIFT_PIPELINE_STEPS : PIPELINE_STEPS;
  const currentIndex = steps.findIndex(s => s.status === currentStatus);

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 relative">
              <div className={`
                flex items-center justify-center rounded-full transition-all duration-500
                ${isCurrent
                  ? `h-8 w-8 sm:h-10 sm:w-10 ${step.color} bg-current/10 ring-2 ring-current/30 ring-offset-1 sm:ring-offset-2 ring-offset-background shadow-lg`
                  : isCompleted
                    ? 'h-6 w-6 sm:h-8 sm:w-8 bg-green-100 text-green-600 dark:bg-green-900/40'
                    : 'h-6 w-6 sm:h-8 sm:w-8 bg-muted text-muted-foreground'
                }
              `}>
                <Icon className={`${isCurrent ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3 w-3 sm:h-4 sm:w-4'} ${isCurrent ? step.color : ''}`} />
              </div>
              <span className={`text-[9px] sm:text-[10px] whitespace-nowrap text-center leading-tight max-w-[50px] sm:max-w-[70px] hidden sm:block ${
                isCurrent ? 'font-semibold text-foreground !block' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {t(step.status)}
              </span>
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 sm:mx-1.5 rounded-full transition-colors duration-500 ${
                isCompleted ? 'bg-green-400 dark:bg-green-600' : isPending ? 'bg-muted' : 'bg-gradient-to-r from-green-400 to-muted'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
