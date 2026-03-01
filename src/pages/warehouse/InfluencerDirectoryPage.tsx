import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getInfluencerContacts } from '@/services/supabase/wh-influencer-hub';
import { InfluencerProfileCard } from '@/components/warehouse/influencer/InfluencerProfileCard';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { WhContact, InfluencerTier, SocialPlatform } from '@/types/warehouse';

type SortOption = 'followers' | 'engagement' | 'name' | 'recent';

export function InfluencerDirectoryPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<WhContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<InfluencerTier | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('recent');

  const staggered = useStaggeredList(contacts.length);

  const load = async () => {
    try {
      const data = await getInfluencerContacts({
        search: search || undefined,
        tier: tierFilter !== 'all' ? tierFilter : undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        sort,
      });
      setContacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, tierFilter, platformFilter, sort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          {t('Influencer Directory')}
        </h1>
        <Button onClick={() => navigate('/warehouse/contacts')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Influencer')}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search influencers...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tierFilter} onValueChange={(val) => setTierFilter(val as InfluencerTier | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('Tier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Tiers')}</SelectItem>
            <SelectItem value="nano">{t('Nano')}</SelectItem>
            <SelectItem value="micro">{t('Micro')}</SelectItem>
            <SelectItem value="mid">{t('Mid-Tier')}</SelectItem>
            <SelectItem value="macro">{t('Macro')}</SelectItem>
            <SelectItem value="mega">{t('Mega')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={(val) => setPlatformFilter(val as SocialPlatform | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('Platform')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Platforms')}</SelectItem>
            <SelectItem value="instagram">{t('Instagram')}</SelectItem>
            <SelectItem value="tiktok">{t('TikTok')}</SelectItem>
            <SelectItem value="youtube">{t('YouTube')}</SelectItem>
            <SelectItem value="twitter">{t('X / Twitter')}</SelectItem>
            <SelectItem value="pinterest">{t('Pinterest')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(val) => setSort(val as SortOption)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('Sort')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="followers">{t('Followers')}</SelectItem>
            <SelectItem value="engagement">{t('Engagement')}</SelectItem>
            <SelectItem value="name">{t('Name')}</SelectItem>
            <SelectItem value="recent">{t('Recent')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <Skeleton className="h-16 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-16 rounded-full mx-auto -mt-12" />
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Skeleton className="h-14 rounded-md" />
                  <Skeleton className="h-14 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">{t('No influencers found')}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {t('Add influencer contacts to start managing collaborations')}
          </p>
          <Button onClick={() => navigate('/warehouse/contacts')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Influencer')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map((contact, idx) => (
            <InfluencerProfileCard
              key={contact.id}
              contact={contact}
              isVisible={staggered[idx] ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
