import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavDepth } from '@/hooks/use-nav-depth';
import { guestState, registerGuestStateFlush } from '@/lib/guest-state';
import { DISCOVER_NODES, DISCOVER_TITLES } from './discover-nav';

/**
 * Shell for guest mode.
 *
 * The <main> classes are character-for-character the ones AppLayout uses. That
 * is not incidental: the four reused pages render <PageContainer size="full"
 * padding={false}> and rely on this element for their gutters, so "improving"
 * the padding here silently breaks all of them.
 *
 * Likewise the bottom bar is not decoration. `.pb-app` budgets for
 * --bottom-nav-h; without a bar every reused page would over-pad by that much.
 */
export function DiscoverLayout() {
  const { t } = useTranslation(['journey', 'common']);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { canGoBack } = useNavDepth();

  useEffect(() => {
    void guestState.visited.mark();
    // Pending writes are debounced; without a flush on background the last tick
    // before the user switches apps is lost, which reads as "my ticks vanished".
    let dispose: (() => void) | undefined;
    void registerGuestStateFlush().then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, []);

  const titleKey = DISCOVER_TITLES[pathname] ?? 'discover.title';

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header
        className="sticky top-0 z-40 flex items-center gap-1 border-b bg-background/80 px-2 pb-2 backdrop-blur-xl"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.5rem)' }}
      >
        {canGoBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            aria-label={t('Back', { ns: 'common' })}
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : (
          <span className="w-2" />
        )}

        <h1 className="min-w-0 flex-1 truncate px-1 text-title font-semibold tracking-tight">
          {t(titleKey)}
        </h1>

        {/* The single always-visible conversion affordance. Everything else is
            contextual and fires only after the guest has got something out of
            the app — see GuestUpsellCard. */}
        <Button
          variant="ghost"
          size="sm"
          className="touch-target shrink-0 text-primary"
          onClick={() => navigate('/login?mode=signup&from=discover')}
        >
          <Sparkles className="mr-1.5 size-4" />
          {t('discover.signUp')}
        </Button>
      </header>

      <main className="flex-1 overflow-auto overscroll-contain p-4 pb-app sm:p-6">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-background/95 backdrop-blur-xl"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
        aria-label={t('discover.title')}
      >
        {DISCOVER_NODES.slice(0, 5).map((node) => {
          const active = pathname === node.path;
          const Icon = node.icon;
          return (
            <Link
              key={node.path}
              to={node.path}
              aria-current={active ? 'page' : undefined}
              className="touch-target flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <Icon
                className={`size-5 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden
              />
              <span
                className={`text-micro leading-none ${active ? 'font-medium text-primary' : 'text-muted-foreground'}`}
              >
                {t(node.titleKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
