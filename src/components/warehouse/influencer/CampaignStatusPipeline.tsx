import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CAMPAIGN_STATUS_COLORS } from '@/lib/warehouse-constants';
import type { CampaignStatus } from '@/types/warehouse';

const PIPELINE_STEPS: CampaignStatus[] = [
  'draft', 'planning', 'outreach', 'active', 'review', 'completed',
];

interface CampaignStatusPipelineProps {
  currentStatus: CampaignStatus;
  className?: string;
}

export function CampaignStatusPipeline({ currentStatus, className = '' }: CampaignStatusPipelineProps) {
  const { t } = useTranslation('warehouse');

  if (currentStatus === 'cancelled') {
    return (
      <div className={className}>
        <Badge className={`${CAMPAIGN_STATUS_COLORS.cancelled} border-0`}>
          {t('cancelled')}
        </Badge>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.indexOf(currentStatus);

  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {PIPELINE_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <div
                className={`
                  relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? `${CAMPAIGN_STATUS_COLORS[step]} ring-2 ring-offset-2 ring-offset-background` : ''}
                  ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
                {isActive && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
                )}
              </div>
              {/* Label */}
              <span
                className={`text-[10px] leading-tight text-center max-w-14 ${
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t(step)}
              </span>
            </div>
            {/* Connector line */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`mx-1 mt-[-18px] h-0.5 w-6 sm:w-10 ${
                  i < currentIndex ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
