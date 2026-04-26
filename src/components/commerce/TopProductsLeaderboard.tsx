import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Leaf, QrCode, Package } from 'lucide-react';
import type { CommerceLeaderboardEntry } from '@/types/commerce-channels';

interface TopProductsLeaderboardProps {
  entries: CommerceLeaderboardEntry[];
}

export function TopProductsLeaderboard({ entries }: TopProductsLeaderboardProps) {
  const { t } = useTranslation('commerce');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h3 className="text-sm font-medium tracking-wider uppercase text-white/80">
          {t('Top Products — 30 days')}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40">{t('by revenue')}</span>
      </div>

      <ol className="divide-y divide-white/5">
        {entries.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-white/40">
            {t('No products sold in this window yet')}
          </li>
        )}
        {entries.map((e, i) => (
          <motion.li
            key={e.productId || e.title}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3"
          >
            <span className="font-display tabular-nums text-2xl text-white/30 w-7 text-right">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {e.imageUrl ? (
                  <img src={e.imageUrl} alt="" className="h-8 w-8 rounded-md object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/10">
                    <Package className="h-4 w-4 text-white/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{e.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                    <span>{new Intl.NumberFormat('de-DE').format(e.unitsSold)} {t('units')}</span>
                    {e.carbonFootprintKg != null && e.carbonFootprintKg > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Leaf className="h-3 w-3 text-emerald-400" />
                          {e.carbonFootprintKg.toFixed(1)} kg CO₂
                        </span>
                      </>
                    )}
                    {e.hasDpp && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-emerald-300">
                          <QrCode className="h-2.5 w-2.5" />
                          DPP
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display tabular-nums text-sm text-white">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(e.revenue)}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
