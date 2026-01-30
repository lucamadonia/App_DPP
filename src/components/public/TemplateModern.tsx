import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  Download,
  MapPin,
  Info,
  Building2,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | null;
  view: 'consumer' | 'customs';
}

const ratingColors: Record<string, string> = {
  A: 'from-green-400 to-green-600',
  B: 'from-lime-400 to-lime-600',
  C: 'from-yellow-400 to-yellow-600',
  D: 'from-orange-400 to-orange-600',
  E: 'from-red-400 to-red-600',
};

const ratingBgColors: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

const ratingDescriptions: Record<string, string> = {
  A: 'Excellent - well below average',
  B: 'Good - below average',
  C: 'Average',
  D: 'Above average',
  E: 'Well above average',
};

export function TemplateModern({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  if (view === 'customs') {
    return <ModernCustomsView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} />;
  }

  return <ModernConsumerView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} />;
}

interface ViewProps {
  product: Product;
  isFieldVisible: (field: string) => boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}

function ModernConsumerView({ product, isFieldVisible, t, locale }: ViewProps) {
  return (
    <div className="space-y-8 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 py-10 sm:py-16">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-2/5 flex-shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-72 object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-4 text-center md:text-left">
              {isFieldVisible('name') && (
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{product.name}</h1>
              )}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {isFieldVisible('category') && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                    {product.category}
                  </span>
                )}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white ${ratingBgColors[product.carbonFootprint.rating]}`}>
                    CO2: {product.carbonFootprint.rating}
                  </span>
                )}
              </div>
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {isFieldVisible('description') && (
                <p className="text-foreground/80 text-lg leading-relaxed max-w-xl">{product.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8">
        {/* Materials */}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('Material Composition')}</h2>
                <p className="text-sm text-muted-foreground">{t('Materials used and their origins')}</p>
              </div>
            </div>
            <div className="space-y-5">
              {product.materials.map((material, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{material.name}</span>
                      {material.recyclable && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800">
                          <Recycle className="h-3 w-3" />
                          {t('Recyclable')}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-primary">{material.percentage}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all"
                      style={{ width: `${material.percentage}%` }}
                    />
                  </div>
                  {isFieldVisible('materialOrigins') && material.origin && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {t('Origin')}: {material.origin}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carbon Footprint + Recycling side by side on desktop */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Carbon Footprint */}
          {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
            <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{t('Carbon Footprint')}</h2>
                  <p className="text-sm text-muted-foreground">{t('Climate impact across the product lifecycle')}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-6">
                {/* Rating Circle */}
                <div className="relative">
                  <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${ratingColors[product.carbonFootprint.rating]} flex items-center justify-center shadow-lg`}>
                    <span className="text-5xl font-bold text-white">{product.carbonFootprint.rating}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
                  <p className="text-sm text-muted-foreground">{t(ratingDescriptions[product.carbonFootprint.rating])}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="text-center p-4 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{product.carbonFootprint.productionKgCO2} kg</p>
                    <p className="text-sm text-muted-foreground">{t('Production')}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{product.carbonFootprint.transportKgCO2} kg</p>
                    <p className="text-sm text-muted-foreground">{t('Transport')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recycling */}
          {isFieldVisible('recyclability') && (
            <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Recycle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{t('Recycling & Disposal')}</h2>
                  <p className="text-sm text-muted-foreground">{t('Guide for environmentally friendly disposal')}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-6">
                {/* Circular Percentage */}
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                      className="text-green-500"
                      strokeLinecap="round"
                      strokeDasharray={`${product.recyclability.recyclablePercentage * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-600">{product.recyclability.recyclablePercentage}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t('Recyclable')}</p>

                {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
                  <div className="w-full p-4 bg-muted/50 rounded-xl">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4" />
                      {t('Recycling Instructions')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {product.recyclability.instructions}
                    </p>
                  </div>
                )}

                {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
                  <div className="w-full">
                    <h4 className="font-medium mb-2 text-sm">{t('Disposal Methods')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.recyclability.disposalMethods.map((method, index) => (
                        <span key={index} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Certifications */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('Certifications')}</h2>
                <p className="text-sm text-muted-foreground">{t('Verified quality and sustainability standards')}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.certifications.map((cert, index) => (
                <div key={index} className="p-4 rounded-xl bg-muted/30 ring-1 ring-black/5 hover:ring-primary/30 transition-all flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t('Valid until')}: {formatDate(cert.validUntil, locale)}
                    </p>
                    <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                      {t('Valid')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supply Chain */}
        {isFieldVisible('supplyChainSimple') && product.supplyChain.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('Supply Chain')}</h2>
                <p className="text-sm text-muted-foreground">{t('The journey of your product from raw material to you')}</p>
              </div>
            </div>
            <div className="space-y-0">
              {product.supplyChain.map((entry, index) => {
                const isLast = index === product.supplyChain.length - 1;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${isLast ? 'bg-gradient-to-br from-primary to-primary/70 animate-pulse' : 'bg-gradient-to-br from-primary/80 to-primary/60'}`}>
                        {entry.step}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-10 bg-gradient-to-b from-primary/40 to-primary/10" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {entry.location}, {entry.country}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModernCustomsView({ product, isFieldVisible, t, locale }: ViewProps) {
  return (
    <div className="space-y-8 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 py-10 sm:py-16">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-1/3 flex-shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-4">
              {isFieldVisible('name') && (
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {/* Identifier Badges */}
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('gtin') && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">GTIN</span>
                    {product.gtin}
                  </span>
                )}
                {isFieldVisible('serialNumber') && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('Serial Number')}</span>
                    {product.serialNumber}
                  </span>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('Batch Number')}</span>
                    {product.batchNumber}
                  </span>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('HS Code')}</span>
                    {product.hsCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-8">
        {/* Customs Data */}
        <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t('Customs Data')}</h2>
              <p className="text-sm text-muted-foreground">{t('Information for customs clearance and import/export')}</p>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Product Data */}
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4" />
                {t('Product Data')}
              </h4>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Country of Origin')}</span>
                  <span className="font-medium">{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Net Weight')}</span>
                  <span className="font-medium">{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Gross Weight')}</span>
                  <span className="font-medium">{product.grossWeight} g</span>
                </div>
              )}
              <div className="flex justify-between py-2.5 border-b">
                <span className="text-muted-foreground">{t('Production Date')}</span>
                <span className="font-medium">{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>
            {/* Manufacturer Data */}
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                {t('Manufacturer Data')}
              </h4>
              <div className="flex justify-between py-2.5 border-b">
                <span className="text-muted-foreground">{t('Company')}</span>
                <span className="font-medium">{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Address')}</span>
                  <span className="font-medium text-right text-sm">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('EORI Number')}</span>
                  <span className="font-mono font-medium">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('VAT ID')}</span>
                  <span className="font-mono font-medium">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Materials Table */}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('Material Composition')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 font-medium text-muted-foreground">{t('Material')}</th>
                    <th className="py-3 font-medium text-muted-foreground text-right">{t('Share')}</th>
                    <th className="py-3 font-medium text-muted-foreground text-center">{t('Recyclable')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Origin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.materials.map((material, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3 font-medium">{material.name}</td>
                      <td className="py-3 text-right font-mono">{material.percentage}%</td>
                      <td className="py-3 text-center">
                        {material.recyclable ? (
                          <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">{t('Yes')}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{t('No')}</Badge>
                        )}
                      </td>
                      <td className="py-3">{material.origin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Certifications with Downloads */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('Certifications')}</h2>
            </div>
            <div className="space-y-3">
              {product.certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 ring-1 ring-black/5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cert.issuedBy} | {t('Valid until')}: {formatDate(cert.validUntil, locale)}
                      </p>
                    </div>
                  </div>
                  {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                    <Button variant="outline" size="sm" className="rounded-lg">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Supply Chain */}
        {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('Full Supply Chain')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 font-medium text-muted-foreground">{t('Step')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Description')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Location')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Country')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3">
                        <Badge variant="outline" className="font-mono">{entry.step}</Badge>
                      </td>
                      <td className="py-3 font-medium">{entry.description}</td>
                      <td className="py-3">{entry.location}</td>
                      <td className="py-3">{entry.country}</td>
                      <td className="py-3">{formatDate(entry.date, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Carbon Footprint */}
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-md transition-all p-6 sm:p-8 ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('Carbon Footprint')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Total')}</p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Production')}</p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.transportKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Transport')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
