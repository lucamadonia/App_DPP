import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const LANGUAGE_OPTIONS: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: 'GB' },
  de: { label: 'Deutsch', flag: 'DE' },
  fr: { label: 'Francais', flag: 'FR' },
  es: { label: 'Espanol', flag: 'ES' },
  it: { label: 'Italiano', flag: 'IT' },
  nl: { label: 'Nederlands', flag: 'NL' },
  pt: { label: 'Portugues', flag: 'PT' },
  pl: { label: 'Polski', flag: 'PL' },
  cs: { label: 'Cestina', flag: 'CZ' },
  da: { label: 'Dansk', flag: 'DK' },
  sv: { label: 'Svenska', flag: 'SE' },
  fi: { label: 'Suomi', flag: 'FI' },
  nb: { label: 'Norsk', flag: 'NO' },
  hu: { label: 'Magyar', flag: 'HU' },
  ro: { label: 'Romana', flag: 'RO' },
  bg: { label: 'Bulgarski', flag: 'BG' },
  el: { label: 'Ellinika', flag: 'GR' },
  ja: { label: 'Nihongo', flag: 'JP' },
  zh: { label: 'Zhongwen', flag: 'CN' },
  ko: { label: 'Hangugeo', flag: 'KR' },
};

interface LanguageSwitcherProps {
  activeLanguage: string;
  onLanguageChange: (lang: string) => void;
  availableLanguages: string[];
  translatedLanguages?: string[];
}

export function LanguageSwitcher({
  activeLanguage,
  onLanguageChange,
  availableLanguages,
  translatedLanguages = [],
}: LanguageSwitcherProps) {
  const { t } = useTranslation('products');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Badge
        variant={activeLanguage === 'default' ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer gap-1.5',
          activeLanguage === 'default' && 'ring-2 ring-ring ring-offset-1'
        )}
        onClick={() => onLanguageChange('default')}
      >
        {t('Default Language')}
      </Badge>
      {availableLanguages.map((lang) => {
        const langInfo = LANGUAGE_OPTIONS[lang];
        if (!langInfo) return null;
        const hasTranslation = translatedLanguages.includes(lang);
        return (
          <Badge
            key={lang}
            variant={activeLanguage === lang ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer gap-1.5',
              activeLanguage === lang && 'ring-2 ring-ring ring-offset-1'
            )}
            onClick={() => onLanguageChange(lang)}
          >
            <span className="uppercase text-xs font-bold">{lang}</span>
            <span className="hidden sm:inline">{langInfo.label}</span>
            {hasTranslation && (
              <Check className="h-3 w-3 text-green-500" />
            )}
          </Badge>
        );
      })}
    </div>
  );
}
