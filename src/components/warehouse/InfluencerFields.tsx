import { useTranslation } from 'react-i18next';
import { Instagram, Youtube, Music2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WhContactInput, SocialPlatform, InfluencerTier } from '@/types/warehouse';

interface InfluencerFieldsProps {
  form: Partial<WhContactInput>;
  onChange: (updates: Partial<WhContactInput>) => void;
}

export function InfluencerFields({ form, onChange }: InfluencerFieldsProps) {
  const { t } = useTranslation('warehouse');

  return (
    <div className="space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4">
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />
        <h4 className="text-xs sm:text-sm font-semibold text-foreground">{t('Social Media Profiles')}</h4>
      </div>

      {/* Social handles */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5 text-pink-500" />
            {t('Instagram Handle')}
          </Label>
          <Input
            placeholder="@username"
            value={form.instagramHandle || ''}
            onChange={(e) => onChange({ instagramHandle: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5" />
            {t('TikTok Handle')}
          </Label>
          <Input
            placeholder="@username"
            value={form.tiktokHandle || ''}
            onChange={(e) => onChange({ tiktokHandle: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-red-500" />
            {t('YouTube Handle')}
          </Label>
          <Input
            placeholder="@channel"
            value={form.youtubeHandle || ''}
            onChange={(e) => onChange({ youtubeHandle: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-gray-500" />
            {t('Other Social URL')}
          </Label>
          <Input
            placeholder="https://..."
            value={form.otherSocialUrl || ''}
            onChange={(e) => onChange({ otherSocialUrl: e.target.value })}
          />
        </div>
      </div>

      {/* Platform, tier, niche */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t('Primary Platform')}</Label>
          <Select
            value={form.primaryPlatform || ''}
            onValueChange={(v) => onChange({ primaryPlatform: v as SocialPlatform })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {(['instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other'] as SocialPlatform[]).map((p) => (
                <SelectItem key={p} value={p}>{t(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('Influencer Tier')}</Label>
          <Select
            value={form.influencerTier || ''}
            onValueChange={(v) => onChange({ influencerTier: v as InfluencerTier })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {(['nano', 'micro', 'mid', 'macro', 'mega'] as InfluencerTier[]).map((tier) => (
                <SelectItem key={tier} value={tier}>{t(tier)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('Niche')}</Label>
          <Input
            placeholder="e.g. Fashion, Tech, Food..."
            value={form.niche || ''}
            onChange={(e) => onChange({ niche: e.target.value })}
          />
        </div>
      </div>

      {/* Follower count & engagement rate */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('Follower Count')}</Label>
          <Input
            type="number"
            min={0}
            value={form.followerCount ?? ''}
            onChange={(e) => onChange({ followerCount: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('Engagement Rate')} (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.engagementRate ?? ''}
            onChange={(e) => onChange({ engagementRate: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>
    </div>
  );
}
