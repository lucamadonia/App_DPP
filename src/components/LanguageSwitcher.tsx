import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { syncLocaleToMetadata } from '@/services/supabase/auth';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'el', label: 'Ελληνικά', short: 'EL' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'en').slice(0, 2).toLowerCase();
  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  const changeLanguage = async (code: string) => {
    if (code === current) return;
    await i18n.changeLanguage(code);
    document.documentElement.lang = code;
    // Keep Supabase user_metadata.locale in sync so auth emails pick the
    // right template on the next send. Fire-and-forget; safe to ignore errors.
    void syncLocaleToMetadata();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          title={active.label}
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{active.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="cursor-pointer justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-muted-foreground w-6">{lang.short}</span>
              <span>{lang.label}</span>
            </span>
            {current === lang.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
