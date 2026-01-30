import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === 'de' ? 'de' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
      title={currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{currentLang === 'de' ? 'EN' : 'DE'}</span>
    </Button>
  );
}
