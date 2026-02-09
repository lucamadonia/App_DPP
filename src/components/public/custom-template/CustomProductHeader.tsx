/**
 * Product header with 4 layout modes: horizontal, stacked, overlay, minimal.
 */
import type { CSSProperties } from 'react';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SafeHtml } from '@/components/ui/safe-html';
import type { Product } from '@/types/product';
import type { DPPProductHeaderLayout, DPPImageDisplayStyle } from '@/types/database';
import { RATING_BG_COLORS } from '@/lib/dpp-template-helpers';

interface Props {
  product: Product;
  isFieldVisible: (field: string) => boolean;
  headerLayout: DPPProductHeaderLayout;
  imageDisplayStyle: DPPImageDisplayStyle;
  showBadges: boolean;
  cardStyle: CSSProperties;
  headingStyle: CSSProperties;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function getImageClass(style: DPPImageDisplayStyle): string {
  switch (style) {
    case 'square': return 'rounded-none';
    case 'circle': return 'rounded-full aspect-square object-cover';
    case 'hero-banner': return 'rounded-lg w-full h-48 object-cover';
    case 'side-panel': return 'rounded-lg';
    case 'rounded':
    default: return 'rounded-lg';
  }
}

function getImageContainerClass(style: DPPImageDisplayStyle): string {
  switch (style) {
    case 'circle': return 'w-32 h-32 flex-shrink-0';
    case 'hero-banner': return 'w-full';
    default: return 'w-full md:w-48 flex-shrink-0';
  }
}

export function CustomProductHeader({
  product,
  isFieldVisible,
  headerLayout,
  imageDisplayStyle,
  showBadges,
  cardStyle,
  headingStyle,
  t,
}: Props) {
  const imageEl = isFieldVisible('image') && product.imageUrl ? (
    <div className={getImageContainerClass(imageDisplayStyle)}>
      <img
        src={product.imageUrl}
        alt={product.name}
        className={`${getImageClass(imageDisplayStyle)} border`}
        style={imageDisplayStyle !== 'hero-banner' ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
      />
    </div>
  ) : null;

  const badges = showBadges ? (
    <div className="flex flex-wrap gap-2">
      {isFieldVisible('category') && <Badge variant="outline">{product.category}</Badge>}
      {isFieldVisible('carbonRating') && product.carbonFootprint && (
        <Badge className={`${RATING_BG_COLORS[product.carbonFootprint.rating]} text-white`}>
          {t('CO2 Rating')}: {product.carbonFootprint.rating}
        </Badge>
      )}
    </div>
  ) : null;

  const info = (
    <div className="flex-1 space-y-3">
      {isFieldVisible('name') && (
        <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
      )}
      {isFieldVisible('manufacturer') && (
        <p className="text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />{product.manufacturer}
        </p>
      )}
      {badges}
      {isFieldVisible('description') && (
        <>
          <Separator />
          <SafeHtml html={product.description} className="text-foreground/90" />
        </>
      )}
    </div>
  );

  switch (headerLayout) {
    case 'stacked':
      return (
        <div style={cardStyle} className="p-6 rounded-lg">
          {imageDisplayStyle === 'hero-banner' && imageEl}
          <div className={`space-y-3 ${imageDisplayStyle === 'hero-banner' ? 'mt-4' : ''}`}>
            {imageDisplayStyle !== 'hero-banner' && (
              <div className="flex justify-center">{imageEl}</div>
            )}
            <div className="text-center space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <Building2 className="h-4 w-4" />{product.manufacturer}
                </p>
              )}
              {badges && <div className="flex justify-center">{badges}</div>}
              {isFieldVisible('description') && (
                <>
                  <Separator />
                  <SafeHtml html={product.description} className="text-foreground/90" />
                </>
              )}
            </div>
          </div>
        </div>
      );

    case 'overlay':
      return (
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            ...cardStyle,
            backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '200px',
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative p-6 text-white space-y-3">
            {isFieldVisible('name') && (
              <h1 className="text-2xl font-bold">{product.name}</h1>
            )}
            {isFieldVisible('manufacturer') && (
              <p className="flex items-center gap-2 opacity-90">
                <Building2 className="h-4 w-4" />{product.manufacturer}
              </p>
            )}
            {showBadges && (
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('category') && <Badge className="bg-white/20 text-white border-white/30">{product.category}</Badge>}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <Badge className={`${RATING_BG_COLORS[product.carbonFootprint.rating]} text-white`}>
                    {t('CO2 Rating')}: {product.carbonFootprint.rating}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="space-y-2">
          {isFieldVisible('name') && (
            <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
          )}
          {isFieldVisible('manufacturer') && (
            <p className="text-muted-foreground text-sm flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />{product.manufacturer}
            </p>
          )}
          {badges}
        </div>
      );

    case 'horizontal':
    default:
      return (
        <div style={cardStyle} className="p-6 rounded-lg">
          <div className="flex flex-col md:flex-row gap-6">
            {imageEl}
            {info}
          </div>
        </div>
      );
  }
}
