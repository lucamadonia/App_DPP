/**
 * Carbon footprint section with 4 display modes: gauge, stat-cards, comparison-bar, infographic.
 */
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/types/product';
import type { DPPCarbonDisplayMode, DPPRatingVisualization } from '@/types/database';
import { RATING_BG_COLORS, RATING_DESCRIPTIONS } from '@/lib/dpp-template-helpers';

interface Props {
  product: Product;
  displayMode: DPPCarbonDisplayMode;
  ratingVisualization: DPPRatingVisualization;
  primaryColor: string;
  compact: boolean;
  t: (key: string) => string;
}

function RatingBadge({ rating, style, primaryColor }: { rating: string; style: DPPRatingVisualization; primaryColor: string }) {
  const ratingNum = { A: 95, B: 75, C: 55, D: 35, E: 15 }[rating] ?? 50;

  switch (style) {
    case 'letter-grade':
      return (
        <div className={`w-16 h-16 ${RATING_BG_COLORS[rating]} text-white flex items-center justify-center text-3xl font-bold rounded-lg`}>
          {rating}
        </div>
      );

    case 'progress-bar':
      return (
        <div className="w-full max-w-[200px] space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-lg">{rating}</span>
            <span className="text-muted-foreground">{ratingNum}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${RATING_BG_COLORS[rating]}`} style={{ width: `${ratingNum}%` }} />
          </div>
        </div>
      );

    case 'stars': {
      const stars = { A: 5, B: 4, C: 3, D: 2, E: 1 }[rating] ?? 3;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`w-5 h-5 ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="ml-2 font-bold text-lg">{rating}</span>
        </div>
      );
    }

    case 'speedometer': {
      const angle = -90 + (ratingNum / 100) * 180;
      return (
        <svg width="100" height="60" viewBox="0 0 100 60" className="flex-shrink-0">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={primaryColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(ratingNum / 100) * 126} 126`} />
          <text x="50" y="48" textAnchor="middle" className="text-lg font-bold fill-current">{rating}</text>
        </svg>
      );
    }

    case 'circle-badge':
    default:
      return (
        <div className={`w-16 h-16 rounded-full ${RATING_BG_COLORS[rating]} text-white flex items-center justify-center text-3xl font-bold`}>
          {rating}
        </div>
      );
  }
}

function GaugeMode({ product, ratingVisualization, primaryColor, compact, t }: Omit<Props, 'displayMode'>) {
  const cf = product.carbonFootprint!;
  const spacing = compact ? 'space-y-3' : 'space-y-6';
  return (
    <div className={spacing}>
      <div className="flex items-center gap-4">
        <RatingBadge rating={cf.rating} style={ratingVisualization} primaryColor={primaryColor} />
        <div>
          <p className="font-semibold text-lg">{cf.totalKgCO2} {t('kg CO2')}</p>
          <p className="text-sm text-muted-foreground">{t(RATING_DESCRIPTIONS[cf.rating])}</p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg text-center">
          <p className="text-2xl font-bold">{cf.productionKgCO2} kg</p>
          <p className="text-sm text-muted-foreground">{t('Production')}</p>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <p className="text-2xl font-bold">{cf.transportKgCO2} kg</p>
          <p className="text-sm text-muted-foreground">{t('Transport')}</p>
        </div>
      </div>
    </div>
  );
}

function StatCardsMode({ product, ratingVisualization, primaryColor, t }: Omit<Props, 'displayMode' | 'compact'>) {
  const cf = product.carbonFootprint!;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 border rounded-lg text-center space-y-2">
        <p className="text-3xl font-bold">{cf.totalKgCO2}</p>
        <p className="text-sm text-muted-foreground">{t('kg CO2 Total')}</p>
        <div className="flex justify-center">
          <RatingBadge rating={cf.rating} style={ratingVisualization} primaryColor={primaryColor} />
        </div>
      </div>
      <div className="p-4 border rounded-lg text-center">
        <p className="text-3xl font-bold">{cf.productionKgCO2}</p>
        <p className="text-sm text-muted-foreground">{t('kg CO2 Production')}</p>
      </div>
      <div className="p-4 border rounded-lg text-center">
        <p className="text-3xl font-bold">{cf.transportKgCO2}</p>
        <p className="text-sm text-muted-foreground">{t('kg CO2 Transport')}</p>
      </div>
    </div>
  );
}

function ComparisonBarMode({ product, primaryColor, t }: { product: Product; primaryColor: string; t: Props['t'] }) {
  const cf = product.carbonFootprint!;
  const total = cf.totalKgCO2 || 1;
  const prodPct = Math.round((cf.productionKgCO2 / total) * 100);
  const transPct = 100 - prodPct;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`w-12 h-12 rounded-full ${RATING_BG_COLORS[cf.rating]} text-white flex items-center justify-center text-xl font-bold`}>
          {cf.rating}
        </span>
        <div>
          <p className="font-bold text-xl">{cf.totalKgCO2} {t('kg CO2')}</p>
          <p className="text-sm text-muted-foreground">{t(RATING_DESCRIPTIONS[cf.rating])}</p>
        </div>
      </div>
      <div className="w-full h-6 rounded-full overflow-hidden flex">
        <div className="h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: `${prodPct}%`, backgroundColor: primaryColor }}>
          {prodPct}%
        </div>
        <div className="h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: `${transPct}%`, backgroundColor: '#F59E0B' }}>
          {transPct}%
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />{t('Production')}: {cf.productionKgCO2} kg</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" />{t('Transport')}: {cf.transportKgCO2} kg</span>
      </div>
    </div>
  );
}

function InfographicMode({ product, ratingVisualization, primaryColor, t }: Omit<Props, 'displayMode' | 'compact'>) {
  const cf = product.carbonFootprint!;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="text-center space-y-2">
        <RatingBadge rating={cf.rating} style={ratingVisualization} primaryColor={primaryColor} />
        <p className="text-sm text-muted-foreground">{t(RATING_DESCRIPTIONS[cf.rating])}</p>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg border">
          <p className="text-xl font-bold">{cf.totalKgCO2}</p>
          <p className="text-xs text-muted-foreground">{t('Total')}</p>
        </div>
        <div className="p-3 rounded-lg border">
          <p className="text-xl font-bold">{cf.productionKgCO2}</p>
          <p className="text-xs text-muted-foreground">{t('Production')}</p>
        </div>
        <div className="p-3 rounded-lg border">
          <p className="text-xl font-bold">{cf.transportKgCO2}</p>
          <p className="text-xs text-muted-foreground">{t('Transport')}</p>
        </div>
      </div>
    </div>
  );
}

export function CarbonFootprintRenderer({ product, displayMode, ratingVisualization, primaryColor, compact, t }: Props) {
  switch (displayMode) {
    case 'stat-cards':
      return <StatCardsMode product={product} ratingVisualization={ratingVisualization} primaryColor={primaryColor} t={t} />;
    case 'comparison-bar':
      return <ComparisonBarMode product={product} primaryColor={primaryColor} t={t} />;
    case 'infographic':
      return <InfographicMode product={product} ratingVisualization={ratingVisualization} primaryColor={primaryColor} t={t} />;
    case 'gauge':
    default:
      return <GaugeMode product={product} ratingVisualization={ratingVisualization} primaryColor={primaryColor} compact={compact} t={t} />;
  }
}
