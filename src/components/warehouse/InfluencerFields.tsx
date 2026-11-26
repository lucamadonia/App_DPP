import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormGrid, InputAffix } from '@/components/ui/form-layout';
import type { WhContactInput, SocialPlatform, InfluencerTier } from '@/types/warehouse';

interface InfluencerFieldsProps {
  form: Partial<WhContactInput>;
  onChange: (updates: Partial<WhContactInput>) => void;
  /** Which group to render. Wizards split handles and audience into two steps. */
  part?: 'all' | 'handles' | 'audience';
}

/**
 * Influencer-specific contact fields. Renders fields only; the caller
 * provides the section heading (FormSection or wizard step title).
 */
export function InfluencerFields({ form, onChange, part = 'all' }: InfluencerFieldsProps) {
  const { t } = useTranslation('warehouse');
  const showHandles = part !== 'audience';
  const showAudience = part !== 'handles';

  return (
    <div className="space-y-5">
      {showHandles && (
        <FormGrid cols={2}>
          <FormField label={t('Instagram Handle')} optional>
            <Input
              placeholder="@username"
              autoCapitalize="none"
              value={form.instagramHandle || ''}
              onChange={(e) => onChange({ instagramHandle: e.target.value })}
            />
          </FormField>
          <FormField label={t('TikTok Handle')} optional>
            <Input
              placeholder="@username"
              autoCapitalize="none"
              value={form.tiktokHandle || ''}
              onChange={(e) => onChange({ tiktokHandle: e.target.value })}
            />
          </FormField>
          <FormField label={t('YouTube Handle')} optional>
            <Input
              placeholder="@channel"
              autoCapitalize="none"
              value={form.youtubeHandle || ''}
              onChange={(e) => onChange({ youtubeHandle: e.target.value })}
            />
          </FormField>
          <FormField label={t('Other Social URL')} optional>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={form.otherSocialUrl || ''}
              onChange={(e) => onChange({ otherSocialUrl: e.target.value })}
            />
          </FormField>
        </FormGrid>
      )}

      {showAudience && (
        <FormGrid cols={2}>
          <FormField label={t('Primary Platform')}>
            <Select
              value={form.primaryPlatform || ''}
              onValueChange={(v) => onChange({ primaryPlatform: v as SocialPlatform })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(['instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other'] as SocialPlatform[]).map((p) => (
                  <SelectItem key={p} value={p}>{t(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('Influencer Tier')}>
            <Select
              value={form.influencerTier || ''}
              onValueChange={(v) => onChange({ influencerTier: v as InfluencerTier })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(['nano', 'micro', 'mid', 'macro', 'mega'] as InfluencerTier[]).map((tier) => (
                  <SelectItem key={tier} value={tier}>{t(tier)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('Niche')} optional span="full">
            <Input
              placeholder="e.g. Fashion, Tech, Food..."
              value={form.niche || ''}
              onChange={(e) => onChange({ niche: e.target.value })}
            />
          </FormField>
          <FormField label={t('Follower Count')} optional>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.followerCount ?? ''}
              onChange={(e) => onChange({ followerCount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </FormField>
          <FormField label={t('Engagement Rate')} optional>
            <InputAffix suffix="%">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={form.engagementRate ?? ''}
                onChange={(e) => onChange({ engagementRate: e.target.value ? Number(e.target.value) : undefined })}
              />
            </InputAffix>
          </FormField>
        </FormGrid>
      )}
    </div>
  );
}
