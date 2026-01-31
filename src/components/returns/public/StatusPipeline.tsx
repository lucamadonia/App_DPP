import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import type { ReturnStatus } from '@/types/returns-hub';

// Map 12 internal statuses to 6 customer-visible stages
interface PipelineStage {
  labelKey: string;
  statuses: ReturnStatus[];
}

const STAGES: PipelineStage[] = [
  { labelKey: 'Registered', statuses: ['CREATED', 'PENDING_APPROVAL'] },
  { labelKey: 'Approved', statuses: ['APPROVED', 'LABEL_GENERATED'] },
  { labelKey: 'Shipped Back', statuses: ['SHIPPED', 'DELIVERED'] },
  { labelKey: 'Inspection', statuses: ['INSPECTION_IN_PROGRESS'] },
  { labelKey: 'Processing', statuses: ['REFUND_PROCESSING'] },
  { labelKey: 'Completed', statuses: ['REFUND_COMPLETED', 'COMPLETED'] },
];

const REJECTED_STATUSES: ReturnStatus[] = ['REJECTED', 'CANCELLED'];

function getActiveStageIndex(status: ReturnStatus): number {
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].statuses.includes(status)) return i;
  }
  return -1;
}

interface StatusPipelineProps {
  status: ReturnStatus;
}

export function StatusPipeline({ status }: StatusPipelineProps) {
  const { t } = useTranslation('returns');
  const isRejected = REJECTED_STATUSES.includes(status);
  const activeIndex = isRejected ? -1 : getActiveStageIndex(status);

  if (isRejected) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-white">
              <X className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-destructive">
                {status === 'REJECTED' ? t('Rejected') : t('Cancelled')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[500px] py-4">
        {STAGES.map((stage, i) => {
          const isCompleted = i < activeIndex;
          const isCurrent = i === activeIndex;

          return (
            <div key={i} className="flex items-center flex-1">
              {/* Node */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-white border-primary text-primary ring-4 ring-primary/20'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-[11px] text-center whitespace-nowrap ${
                    isCurrent ? 'font-semibold text-primary' : isCompleted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {t(stage.labelKey)}
                </span>
              </div>

              {/* Connector */}
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: isCompleted ? '100%' : isCurrent ? '50%' : '0%',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
