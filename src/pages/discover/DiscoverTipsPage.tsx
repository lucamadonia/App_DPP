import { useTranslation } from 'react-i18next';
import { TipDeck } from '@/components/discover/TipDeck';
import { GuestUpsellCard } from '@/components/discover/GuestUpsellCard';

export function DiscoverTipsPage() {
  const { t } = useTranslation('journey');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1.5">
        <h2 className="text-title-lg font-bold tracking-tight">{t('discover.tools.tips.title')}</h2>
        <p className="text-body leading-relaxed text-muted-foreground">
          {t('discover.tools.tips.desc')}
        </p>
      </header>
      <TipDeck size={12} />
      <GuestUpsellCard reason="tips" />
    </div>
  );
}
