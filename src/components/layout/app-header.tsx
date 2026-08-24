import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useBranding } from '@/hooks/use-branding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavDepth } from '@/hooks/use-nav-depth';
import { findNodeForPath } from '@/lib/nav-tree';
import { useLocation } from 'react-router-dom';

interface AppHeaderProps {
  /** Opens the command palette. */
  onSearch?: () => void;
}

/**
 * The app chrome bar.
 *
 * Sticky with a top safe-area inset, so it sits correctly under a notch or
 * Dynamic Island instead of scrolling away like the previous header did.
 *
 * On mobile the leading slot becomes a contextual back arrow once you are more
 * than one level deep — the hamburger is redundant there because the bottom tab
 * bar plus its More sheet already expose the whole tree.
 */
export function AppHeader({ onSearch }: AppHeaderProps) {
  const { t } = useTranslation('common');
  const { branding } = useBranding();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { canGoBack, parentPath } = useNavDepth();

  const node = findNodeForPath(pathname);
  const title = node ? (node.ns ? t(node.titleKey, { ns: node.ns }) : t(node.titleKey)) : branding.appName;

  const goBack = () => {
    haptic.light();
    if (window.history.length > 1) navigate(-1);
    else navigate(parentPath ?? '/');
  };

  const showBack = isMobile && canGoBack;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 shrink-0',
        'border-b border-transparent bg-background/80 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-background/60',
        'pt-[var(--safe-top)]'
      )}
    >
      <div className="relative flex h-14 items-center gap-2 px-4">
        {showBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="-ml-2 size-10 touch-target"
            aria-label={t('Back')}
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : (
          <SidebarTrigger
            className="-ml-1 size-10 touch-target md:size-8"
            aria-label={t('Open menu')}
          />
        )}

        <Separator orientation="vertical" className="mr-1 h-4 max-md:hidden" />

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold md:text-sm md:font-medium">
          {title}
        </h1>

        {onSearch && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              haptic.light();
              onSearch();
            }}
            className="size-10 touch-target md:size-8"
            aria-label={t('Search')}
          >
            <Search className="size-5 md:size-4" />
          </Button>
        )}

        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      </div>
    </header>
  );
}
