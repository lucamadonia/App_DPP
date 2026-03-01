import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, FileImage, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAMPAIGN_KANBAN_COLUMNS } from '@/lib/warehouse-constants';
import type { WhCampaign, CampaignStatus } from '@/types/warehouse';

interface CampaignKanbanCardProps {
  campaign: WhCampaign;
  onStatusChange: (id: string, status: CampaignStatus) => void;
}

export function CampaignKanbanCard({ campaign, onStatusChange }: CampaignKanbanCardProps) {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const formatBudget = (budget?: number, currency?: string) => {
    if (budget == null) return null;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  const dateRange = campaign.startDate || campaign.endDate
    ? `${formatDate(campaign.startDate) || '?'} - ${formatDate(campaign.endDate) || '?'}`
    : null;

  const budgetLabel = formatBudget(campaign.budget, campaign.currency);

  return (
    <Card
      className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/warehouse/campaigns/${campaign.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Name */}
        <p className="font-medium text-sm line-clamp-2">{campaign.name}</p>

        {/* Date range */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{dateRange || t('No dates')}</span>
        </div>

        {/* Budget */}
        {budgetLabel && (
          <Badge variant="secondary" className="text-xs">
            {budgetLabel}
          </Badge>
        )}

        {/* Tags */}
        {campaign.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campaign.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                <Tag className="mr-0.5 h-2 w-2" />
                {tag}
              </Badge>
            ))}
            {campaign.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{campaign.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Bottom row: mini stats + status dropdown */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5" title={t('Influencers')}>
              <Users className="h-3 w-3" />
              {campaign.productIds.length}
            </span>
            <span className="flex items-center gap-0.5" title={t('Content')}>
              <FileImage className="h-3 w-3" />
              0
            </span>
          </div>

          {/* Status selector */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={campaign.status}
              onValueChange={(val) => onStatusChange(campaign.id, val as CampaignStatus)}
            >
              <SelectTrigger className="h-6 text-[10px] w-[90px] px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_KANBAN_COLUMNS.map((col) => (
                  <SelectItem key={col.key} value={col.key} className="text-xs">
                    {t(col.labelEn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
