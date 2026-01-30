import { useTranslation } from 'react-i18next';

export function useLocale(): 'en' | 'de' {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return lang === 'de' ? 'de' : 'en';
}
