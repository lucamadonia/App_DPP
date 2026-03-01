import { useTranslation } from 'react-i18next';
import { Gift, RotateCcw, Camera, Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignPicker } from './CampaignPicker';
import type { SampleShipmentMeta, SampleType } from '@/types/warehouse';

interface SampleMetaFieldsProps {
  meta: Partial<SampleShipmentMeta>;
  onChange: (meta: Partial<SampleShipmentMeta>) => void;
}

export function SampleMetaFields({ meta, onChange }: SampleMetaFieldsProps) {
  const { t } = useTranslation('warehouse');

  const isLoan = meta.sampleType === 'loan';

  return (
    <div className="space-y-4 rounded-lg border border-pink-200 bg-pink-50/50 p-4 dark:border-pink-900/40 dark:bg-pink-950/20">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-pink-500" />
        <h4 className="text-sm font-semibold">{t('Sample Information')}</h4>
      </div>

      {/* Sample Type */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('Sample Type')}</Label>
          <Select
            value={meta.sampleType || 'gift'}
            onValueChange={(v) => onChange({
              ...meta,
              sampleType: v as SampleType,
              returnExpected: v === 'loan',
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gift">
                <span className="flex items-center gap-2">
                  <Gift className="h-3.5 w-3.5 text-purple-500" />
                  {t('Gift')}
                </span>
              </SelectItem>
              <SelectItem value="loan">
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                  {t('Loan')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('Select Campaign')}</Label>
          <CampaignPicker
            value={meta.campaignId}
            onChange={(campaignId) => onChange({ ...meta, campaignId: campaignId || undefined })}
          />
        </div>
      </div>

      {/* Return settings (only for loans) */}
      {isLoan && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Switch
              checked={meta.returnExpected ?? true}
              onCheckedChange={(v) => onChange({ ...meta, returnExpected: v })}
            />
            <Label className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
              {t('Return Expected')}
            </Label>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t('Return Deadline')}
            </Label>
            <Input
              type="date"
              value={meta.returnDeadline || ''}
              onChange={(e) => onChange({ ...meta, returnDeadline: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Content settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Switch
            checked={meta.contentExpected ?? true}
            onCheckedChange={(v) => onChange({ ...meta, contentExpected: v })}
          />
          <Label className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-amber-500" />
            {t('Content Expected')}
          </Label>
        </div>
        {meta.contentExpected && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t('Content Deadline')}
            </Label>
            <Input
              type="date"
              value={meta.contentDeadline || ''}
              onChange={(e) => onChange({ ...meta, contentDeadline: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
