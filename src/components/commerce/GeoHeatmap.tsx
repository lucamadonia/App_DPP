import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CommerceGeoPoint } from '@/types/commerce-channels';

interface GeoHeatmapProps {
  points: CommerceGeoPoint[];
}

/**
 * GeoHeatmap — where today's orders flow from.
 *
 * Desktop / tablet (≥ md): SVG dot-matrix world map with pulsing rings per
 * country. Looks great at wall-display sizes.
 *
 * Mobile (< md): the SVG world map renders unreadable at 360 px wide (its
 * `fontSize="2.4"` viewBox-unit text becomes ~5 px CSS pixels). We swap to a
 * sorted flag + bar list — same data, more legible.
 */
export function GeoHeatmap({ points }: GeoHeatmapProps) {
  const { t } = useTranslation('commerce');
  const isMobile = useIsMobile();
  const maxOrders = points.reduce((m, p) => Math.max(m, p.orders), 0) || 1;

  if (isMobile) {
    return <GeoCountryList points={points} maxOrders={maxOrders} />;
  }

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h3 className="text-sm font-medium tracking-wider uppercase text-white/80">
          {t('Order Globe — Today')}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          {points.length} {t('countries')}
        </span>
      </div>
      <div className="relative h-[calc(100%-3.5rem)]">
        <svg
          viewBox="-180 -90 360 180"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Latitude grid */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.2">
            {[-60, -30, 0, 30, 60].map((lat) => (
              <line key={lat} x1={-180} y1={-lat} x2={180} y2={-lat} />
            ))}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => (
              <line key={lng} x1={lng} y1={-90} x2={lng} y2={90} />
            ))}
          </g>

          {/* Continent dot-matrix base — pre-computed sparse pattern */}
          <ContinentDots />

          {/* Order pulses */}
          {points.map((p, i) => {
            const radius = 1.5 + (p.orders / maxOrders) * 4;
            return (
              <g key={p.country} transform={`translate(${p.lng}, ${-p.lat})`}>
                <motion.circle
                  cx={0}
                  cy={0}
                  r={radius}
                  fill="rgba(34, 197, 94, 0.08)"
                  stroke="rgba(34, 197, 94, 0.65)"
                  strokeWidth="0.4"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: [0, 0.9, 0.7] }}
                  transition={{ delay: i * 0.05, duration: 0.8 }}
                />
                <motion.circle
                  cx={0}
                  cy={0}
                  r={radius * 2.4}
                  fill="none"
                  stroke="rgba(34, 197, 94, 0.5)"
                  strokeWidth="0.3"
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.1 }}
                />
                <text x={radius + 1.2} y={1.2} fontSize="2.4" fill="rgba(255,255,255,0.85)" fontWeight="600">
                  {p.country}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] uppercase tracking-widest text-white/50">{t('Orders')}</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile alternative to the SVG world map. Top 6 countries with flag emoji,
 * country name, order count, and a proportional bar. Same data shape; no
 * fixed dimensions, no tiny viewBox text. Accessible to screen readers.
 */
function GeoCountryList({ points, maxOrders }: { points: CommerceGeoPoint[]; maxOrders: number }) {
  const { t } = useTranslation('commerce');
  const sorted = [...points].sort((a, b) => b.orders - a.orders);
  const top = sorted.slice(0, 6);
  const rest = Math.max(0, sorted.length - top.length);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h3 className="text-sm font-medium tracking-wider uppercase text-white/80">
          {t('Orders by Country — Today')}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
          {points.length} {t('countries')}
        </span>
      </div>

      {top.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-white/40">
          {t('No orders yet today — connect a channel to start streaming')}
        </div>
      ) : (
        <ol className="divide-y divide-white/5">
          {top.map((p, i) => {
            const widthPct = Math.max(8, (p.orders / maxOrders) * 100);
            return (
              <motion.li
                key={p.country}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3"
              >
                <span aria-hidden className="text-xl leading-none">
                  {flagEmoji(p.country)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {p.countryName || p.country}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500/60"
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display tabular-nums text-sm text-white">
                    {p.orders}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    {t('Orders')}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {rest > 0 && (
        <div className="border-t border-white/5 px-4 py-2.5 text-center text-[11px] uppercase tracking-widest text-white/40">
          + {rest} {t('countries')}
        </div>
      )}
    </div>
  );
}

/** ISO-2 country code → flag emoji via Unicode regional indicator symbols. */
function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🌍';
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  const upper = iso2.toUpperCase();
  const cp1 = A + (upper.charCodeAt(0) - a);
  const cp2 = A + (upper.charCodeAt(1) - a);
  if (cp1 < A || cp1 > A + 25 || cp2 < A || cp2 > A + 25) return '🌍';
  return String.fromCodePoint(cp1, cp2);
}

/**
 * Sparse continent dot-matrix outline.
 * Hand-tuned grid for major land masses; doesn't need tiles or external map data.
 */
function ContinentDots() {
  // Coordinates pre-computed as low-density landmass dots
  const points = LANDMASS_DOTS;
  return (
    <g fill="rgba(255,255,255,0.18)">
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.42" />
      ))}
    </g>
  );
}

// Dense-enough sample of land coordinates for visual context.
// Generated via a simplified outline of continental masses.
const LANDMASS_DOTS: Array<[number, number]> = [
  // Europe
  [-9, -38], [-5, -38], [0, -40], [5, -42], [10, -45], [15, -48], [20, -50], [25, -52],
  [-3, -36], [3, -37], [8, -38], [13, -40], [18, -42], [23, -44], [28, -46], [33, -48],
  [-7, -40], [-2, -41], [3, -42], [8, -43], [13, -45], [18, -47], [23, -49], [28, -51],
  // UK / Scandinavia
  [-3, -52], [-4, -55], [-6, -58], [10, -55], [14, -58], [18, -60], [22, -62], [26, -64], [22, -56],
  // Russia
  [30, -55], [35, -55], [40, -55], [45, -56], [50, -57], [55, -58], [60, -59], [70, -58],
  [80, -56], [90, -54], [100, -52], [110, -52], [120, -54], [130, -56], [140, -58], [150, -60],
  [40, -50], [50, -50], [60, -52], [70, -52], [80, -50], [90, -50], [100, -48], [110, -48],
  // North America
  [-130, -55], [-120, -58], [-110, -55], [-100, -52], [-90, -50], [-80, -45], [-75, -42], [-70, -40],
  [-95, -55], [-85, -55], [-95, -45], [-95, -38], [-85, -38], [-78, -35], [-72, -32], [-67, -30],
  [-110, -45], [-100, -42], [-90, -42], [-80, -38], [-115, -38], [-105, -34], [-95, -30], [-85, -28],
  [-100, -28], [-95, -22], [-90, -20], [-100, -20],
  // South America
  [-78, -10], [-72, -8], [-65, -5], [-58, -2], [-52, 0], [-48, 5], [-45, 10], [-43, 15],
  [-70, -2], [-63, 5], [-57, 10], [-55, 15], [-60, 20], [-65, 25], [-70, 30], [-72, 35],
  [-72, 0], [-67, -2], [-60, -2], [-55, 5], [-52, 10], [-50, 15], [-58, 25], [-62, 30],
  // Africa
  [-15, -28], [-10, -25], [-5, -22], [0, -20], [5, -18], [10, -18], [15, -22], [20, -25], [25, -28],
  [-15, -18], [-12, -12], [-8, -8], [-2, -3], [3, 2], [10, 5], [18, 8], [25, 12], [32, 18],
  [-12, -12], [-5, -10], [0, -8], [5, -5], [10, -2], [18, 5], [22, 12], [28, 18], [35, 25],
  [10, 20], [18, 25], [22, 30], [28, 32], [22, 18], [18, 10], [25, 5],
  // Middle East
  [38, -32], [42, -30], [46, -28], [50, -25], [40, -25], [45, -22], [48, -20], [55, -18],
  // Asia
  [60, -45], [70, -42], [80, -40], [90, -38], [100, -35], [110, -30], [120, -32], [130, -38],
  [70, -32], [80, -30], [85, -25], [95, -22], [105, -22], [115, -25], [125, -28], [135, -32],
  [78, -22], [85, -18], [90, -15], [100, -12], [110, -10], [120, -12], [130, -15], [140, -22],
  [105, -8], [115, -3], [120, 0], [125, 0], [130, -5],
  // India
  [70, -22], [75, -18], [78, -15], [80, -12], [82, -8], [85, -5], [88, -3], [90, -3],
  [73, -25], [80, -20], [85, -15], [88, -12],
  // SEA / Australia
  [110, 5], [120, 8], [130, 10], [140, 18], [145, 22], [150, 28], [135, 25], [125, 28], [115, 30],
  [120, 18], [125, 22], [130, 25], [140, 30], [145, 35], [120, 32], [115, 35],
  // Japan
  [138, -38], [140, -42], [142, -45], [136, -34],
];
