import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentGalleryGrid } from '@/components/warehouse/influencer/ContentGalleryGrid';
import { getCampaigns } from '@/services/supabase/wh-campaigns';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { WhCampaign, SocialPlatform } from '@/types/warehouse';

export function ContentGalleryPage() {
  const { t, i18n } = useTranslation('warehouse');
  const isDE = i18n.language.startsWith('de');
  const [campaigns, setCampaigns] = useState<WhCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');

  useEffect(() => {
    getCampaigns().then(setCampaigns);
  }, []);

  const platformOptions: { value: SocialPlatform | 'all'; label: string }[] = [
    { value: 'all', label: t('All Platforms') },
    ...(Object.entries(SOCIAL_PLATFORM_CONFIG) as [SocialPlatform, typeof SOCIAL_PLATFORM_CONFIG[SocialPlatform]][]).map(
      ([key, cfg]) => ({
        value: key,
        label: isDE ? cfg.labelDe : cfg.labelEn,
      })
    ),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <Image className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600" />
          {t('Content Gallery')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t('Browse all influencer content posts')}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('All Campaigns')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Campaigns')}</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as SocialPlatform | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('All Platforms')} />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content grid */}
      <ContentGalleryGrid
        campaignId={selectedCampaign === 'all' ? undefined : selectedCampaign}
        platformFilter={selectedPlatform}
      />
    </div>
  );
}
