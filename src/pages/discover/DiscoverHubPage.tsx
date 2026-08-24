import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CloudOff, WifiOff } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { staggerDelayFor } from '@/lib/motion';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { useOnline } from '@/hooks/use-online';
import { TipDeck } from '@/components/discover/TipDeck';
import { LQIP } from '@/components/first-run/lqip.generated';
import { DISCOVER_NODES } from './discover-nav';

/**
 * Guest landing surface.
 *
 * The tip deck is the hero rather than a hero image: it is the one thing here
 * that gives something away immediately, with no form to fill in first.
 */
export function DiscoverHubPage() {
  const { t } = useTranslation('journey');
  const budget = useMotionBudget();
  const online = useOnline();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1.5">
        <h2 className="text-title-lg font-bold tracking-tight">{t('discover.headline')}</h2>
        <p className="text-body leading-relaxed text-muted-foreground">{t('discover.sub')}</p>
      </header>

      {!online && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
          <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-caption leading-relaxed">{t('discover.offline')}</p>
        </div>
      )}

      <TipDeck size={5} />

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        {DISCOVER_NODES.map((node, i) => {
          const Icon = node.icon;
          const unavailable = !online && !node.offline;
          return (
            <motion.div
              key={node.path}
              initial={budget === 'reduced' ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: staggerDelayFor(i, budget), ease: 'easeOut' }}
            >
              <Link
                to={node.path}
                aria-disabled={unavailable}
                className={unavailable ? 'pointer-events-none' : undefined}
              >
                <GlassCard
                  enableGlow={!unavailable}
                  className={`h-full overflow-hidden ${unavailable ? 'opacity-50' : ''}`}
                >
                  {/* The LQIP is the background, so the tile is never an empty
                      rectangle while the (5 KB) artwork loads. `loading="lazy"`
                      keeps the six of them off the first paint. */}
                  <div
                    className="relative h-24 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${LQIP[node.image]}")` }}
                  >
                    <img
                      src={`/first-run/${node.image}.webp`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent"
                    />
                    <span className="absolute bottom-2 left-3 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-sm">
                      <Icon className="size-4 text-white" aria-hidden />
                    </span>
                  </div>

                  <div className="flex items-start gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-body font-semibold leading-snug">{t(node.titleKey)}</p>
                      <p className="text-caption leading-relaxed text-muted-foreground">
                        {t(node.descKey)}
                      </p>
                      {unavailable && (
                        <p className="flex items-center gap-1 pt-0.5 text-micro text-warning">
                          <CloudOff className="size-3" aria-hidden />
                          {t('discover.needsConnection')}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
