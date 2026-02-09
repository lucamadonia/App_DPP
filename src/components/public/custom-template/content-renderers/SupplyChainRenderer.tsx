/**
 * Supply chain section with 5 display modes: numbered-list, vertical-timeline, horizontal-timeline, map-cards, table.
 */
import { MapPin, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Product } from '@/types/product';
import type { DPPSupplyChainDisplayMode } from '@/types/database';

interface Props {
  product: Product;
  displayMode: DPPSupplyChainDisplayMode;
  isFieldVisible: (field: string) => boolean;
  primaryColor: string;
  locale: string;
  t: (key: string) => string;
}

function NumberedListMode({ product, isFieldVisible, primaryColor, t }: Omit<Props, 'displayMode' | 'locale'>) {
  return (
    <ol className="space-y-4">
      {product.supplyChain.map((entry, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            {entry.step}
          </span>
          <div className="flex-1 pt-1">
            <p className="font-medium">{entry.description}</p>
            {isFieldVisible('supplyChainProcessType') && entry.processType && (
              <p className="text-xs font-medium mt-0.5" style={{ color: primaryColor }}>
                {t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
              </p>
            )}
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {entry.location}, {entry.country}
            </p>
            {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
              <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                <Leaf className="h-3 w-3" />{entry.emissionsKg} kg CO₂
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function VerticalTimelineMode({ product, isFieldVisible, primaryColor, locale, t }: Omit<Props, 'displayMode'>) {
  return (
    <div className="relative pl-8 space-y-6">
      <div className="absolute left-3 top-2 bottom-2 w-0.5" style={{ backgroundColor: `${primaryColor}30` }} />
      {product.supplyChain.map((entry, index) => (
        <div key={index} className={`relative ${index % 2 === 0 ? '' : 'ml-4'}`}>
          <div
            className="absolute -left-5 top-1 w-4 h-4 rounded-full border-2 bg-white"
            style={{ borderColor: primaryColor }}
          />
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{entry.description}</span>
              <Badge variant="outline" className="text-xs">{t('Step')} {entry.step}</Badge>
            </div>
            {isFieldVisible('supplyChainProcessType') && entry.processType && (
              <Badge className="text-xs mb-1" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                {t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{entry.location}, {entry.country}
            </p>
            {entry.date && <p className="text-xs text-muted-foreground mt-1">{formatDate(entry.date, locale)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizontalTimelineMode({ product, isFieldVisible, primaryColor }: Omit<Props, 'displayMode' | 'locale' | 't'>) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start gap-4 min-w-max relative pt-4">
        <div className="absolute top-7 left-0 right-0 h-0.5" style={{ backgroundColor: `${primaryColor}30` }} />
        {product.supplyChain.map((entry, index) => (
          <div key={index} className="relative flex flex-col items-center w-40 flex-shrink-0">
            <div
              className="w-4 h-4 rounded-full border-2 bg-white z-10 mb-3"
              style={{ borderColor: primaryColor }}
            />
            <div className="text-center space-y-1">
              <p className="font-medium text-sm">{entry.description}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />{entry.country}
              </p>
              {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                <p className="text-xs text-green-600">{entry.emissionsKg} kg CO₂</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapCardsMode({ product, isFieldVisible, primaryColor, t }: Omit<Props, 'displayMode' | 'locale'>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {product.supplyChain.map((entry, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">{t('Step')} {entry.step}</Badge>
            <span className="text-lg">{getCountryFlag(entry.country)}</span>
          </div>
          <p className="font-medium text-sm">{entry.description}</p>
          {isFieldVisible('supplyChainProcessType') && entry.processType && (
            <Badge className="text-xs" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
              {t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{entry.location}, {entry.country}
          </p>
          {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Leaf className="h-3 w-3" />{entry.emissionsKg} kg CO₂
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TableMode({ product, isFieldVisible, locale, t }: Omit<Props, 'displayMode' | 'primaryColor'>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">{t('Step')}</th>
            <th className="text-left py-2">{t('Description')}</th>
            {isFieldVisible('supplyChainProcessType') && <th className="text-left py-2">{t('Process Type')}</th>}
            <th className="text-left py-2">{t('Location')}</th>
            <th className="text-left py-2">{t('Date')}</th>
            {isFieldVisible('supplyChainEmissions') && <th className="text-left py-2">{t('Emissions')}</th>}
          </tr>
        </thead>
        <tbody>
          {product.supplyChain.map((entry, index) => (
            <tr key={index} className="border-b last:border-b-0">
              <td className="py-2">{entry.step}</td>
              <td className="py-2 font-medium">{entry.description}</td>
              {isFieldVisible('supplyChainProcessType') && (
                <td className="py-2">{entry.processType ? t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '-'}</td>
              )}
              <td className="py-2">{entry.location}, {entry.country}</td>
              <td className="py-2">{entry.date ? formatDate(entry.date, locale) : '-'}</td>
              {isFieldVisible('supplyChainEmissions') && (
                <td className="py-2">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple country name to flag emoji (best-effort). */
function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    Germany: '🇩🇪', China: '🇨🇳', USA: '🇺🇸', Japan: '🇯🇵', Korea: '🇰🇷', Taiwan: '🇹🇼',
    Vietnam: '🇻🇳', India: '🇮🇳', Bangladesh: '🇧🇩', Turkey: '🇹🇷', Italy: '🇮🇹', France: '🇫🇷',
    Netherlands: '🇳🇱', Poland: '🇵🇱', Spain: '🇪🇸', UK: '🇬🇧', Austria: '🇦🇹', Switzerland: '🇨🇭',
    DE: '🇩🇪', CN: '🇨🇳', US: '🇺🇸', JP: '🇯🇵', KR: '🇰🇷', TW: '🇹🇼',
    VN: '🇻🇳', IN: '🇮🇳', BD: '🇧🇩', TR: '🇹🇷', IT: '🇮🇹', FR: '🇫🇷',
    NL: '🇳🇱', PL: '🇵🇱', ES: '🇪🇸', GB: '🇬🇧', AT: '🇦🇹', CH: '🇨🇭',
  };
  return flagMap[country] || '🌍';
}

export function SupplyChainRenderer({ product, displayMode, isFieldVisible, primaryColor, locale, t }: Props) {
  switch (displayMode) {
    case 'vertical-timeline':
      return <VerticalTimelineMode product={product} isFieldVisible={isFieldVisible} primaryColor={primaryColor} locale={locale} t={t} />;
    case 'horizontal-timeline':
      return <HorizontalTimelineMode product={product} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
    case 'map-cards':
      return <MapCardsMode product={product} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
    case 'table':
      return <TableMode product={product} isFieldVisible={isFieldVisible} locale={locale} t={t} />;
    case 'numbered-list':
    default:
      return <NumberedListMode product={product} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
  }
}
