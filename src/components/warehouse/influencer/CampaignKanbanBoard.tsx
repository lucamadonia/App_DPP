import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CAMPAIGN_KANBAN_COLUMNS } from '@/lib/warehouse-constants';
import { CampaignKanbanCard } from './CampaignKanbanCard';
import type { WhCampaign, CampaignStatus } from '@/types/warehouse';

interface CampaignKanbanBoardProps {
  campaigns: WhCampaign[];
  onStatusChange: (id: string, status: CampaignStatus) => void;
  className?: string;
}

export function CampaignKanbanBoard({ campaigns, onStatusChange, className }: CampaignKanbanBoardProps) {
  const { t } = useTranslation('warehouse');

  const formatBudgetSum = (items: WhCampaign[]) => {
    const total = items.reduce((sum, c) => sum + (c.budget || 0), 0);
    if (total === 0) return null;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total);
  };

  return (
    <div className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory ${className || ''}`}>
      {CAMPAIGN_KANBAN_COLUMNS.map((col) => {
        const columnCampaigns = campaigns.filter((c) => c.status === col.key);
        const budgetSum = formatBudgetSum(columnCampaigns);

        return (
          <div
            key={col.key}
            className={`min-w-[220px] sm:min-w-[260px] flex-1 rounded-lg bg-muted/30 border border-border/50 border-t-4 snap-start ${col.borderColor}`}
          >
            {/* Column header */}
            <div className="p-2.5 sm:p-3 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold">{t(col.labelEn)}</h3>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {columnCampaigns.length}
                </Badge>
              </div>
              {budgetSum && (
                <p className="text-xs text-muted-foreground mt-0.5">{budgetSum}</p>
              )}
            </div>

            {/* Cards area */}
            <div className="space-y-2 sm:space-y-3 p-2 min-h-[150px] sm:min-h-[200px]">
              {columnCampaigns.map((campaign) => (
                <CampaignKanbanCard
                  key={campaign.id}
                  campaign={campaign}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
