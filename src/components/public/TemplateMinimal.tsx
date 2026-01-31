import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
}

export function TemplateMinimal({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 sm:py-20 space-y-16">
      {/* Product Header */}
      <header className="space-y-6">
        {isFieldVisible('image') && product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 sm:h-80 object-cover"
          />
        )}
        {isFieldVisible('name') && (
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            {product.name}
          </h1>
        )}
        {isFieldVisible('manufacturer') && (
          <p className="text-lg text-muted-foreground">{product.manufacturer}</p>
        )}
        {isFieldVisible('category') && (
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
        )}
        {isFieldVisible('description') && product.description && (
          <p className="text-lg leading-relaxed text-foreground/80">{product.description}</p>
        )}
      </header>

      {/* Identifiers (customs view) */}
      {view === 'customs' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('Product Data')}</h2>
          <div className="space-y-3">
            {isFieldVisible('gtin') && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">GTIN</span>
                <span className="font-mono">{product.gtin}</span>
              </div>
            )}
            {isFieldVisible('serialNumber') && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Serial Number')}</span>
                <span className="font-mono">{product.serialNumber}</span>
              </div>
            )}
            {isFieldVisible('batchNumber') && product.batchNumber && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Batch Number')}</span>
                <span className="font-mono">{product.batchNumber}</span>
              </div>
            )}
            {isFieldVisible('hsCode') && product.hsCode && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('HS Code')}</span>
                <span className="font-mono">{product.hsCode}</span>
              </div>
            )}
            {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Country of Origin')}</span>
                <span>{product.countryOfOrigin}</span>
              </div>
            )}
            {isFieldVisible('netWeight') && product.netWeight && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Net Weight')}</span>
                <span>{product.netWeight} g</span>
              </div>
            )}
            {isFieldVisible('grossWeight') && product.grossWeight && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Gross Weight')}</span>
                <span>{product.grossWeight} g</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('Production Date')}</span>
              <span>{formatDate(product.productionDate, locale)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Manufacturer Data (customs view) */}
      {view === 'customs' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('Manufacturer Data')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('Company')}</span>
              <span>{product.manufacturer}</span>
            </div>
            {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Address')}</span>
                <span className="text-right text-sm">{product.manufacturerAddress}</span>
              </div>
            )}
            {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('EORI Number')}</span>
                <span className="font-mono">{product.manufacturerEORI}</span>
              </div>
            )}
            {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('VAT ID')}</span>
                <span className="font-mono">{product.manufacturerVAT}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">{t('Material Composition')}</h2>
          <div className="space-y-4">
            {product.materials.map((material, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <span className="ml-2 text-xs text-green-600">({t('Recyclable')})</span>
                  )}
                </div>
                <span className="text-lg font-light">{material.percentage}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Carbon Footprint */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">{t('Carbon Footprint')}</h2>
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-light">{product.carbonFootprint.totalKgCO2}</span>
              <span className="text-muted-foreground">{t('kg CO2')}</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <span>{t('Production')}: {product.carbonFootprint.productionKgCO2} kg</span>
              <span>{t('Transport')}: {product.carbonFootprint.transportKgCO2} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('CO2 Rating')}:</span>
              <span className="text-lg font-semibold">{product.carbonFootprint.rating}</span>
            </div>
          </div>
        </section>
      )}

      {/* Recyclability */}
      {isFieldVisible('recyclability') && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">{t('Recycling & Disposal')}</h2>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light">{product.recyclability.recyclablePercentage}%</span>
              <span className="text-muted-foreground">{t('Recyclable')}</span>
            </div>
            {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.recyclability.instructions}
              </p>
            )}
            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.recyclability.disposalMethods.map((method, index) => (
                  <span key={index} className="text-xs text-muted-foreground border-b border-dashed">
                    {method}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Certifications */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">{t('Certifications')}</h2>
          <div className="space-y-4">
            {product.certifications.map((cert, index) => (
              <div key={index} className="py-2">
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.issuedBy} &middot; {t('Valid until')} {formatDate(cert.validUntil, locale)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Supply Chain */}
      {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">
            {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
          </h2>
          <div className="space-y-6">
            {product.supplyChain.map((entry, index) => (
              <div key={index} className="space-y-1">
                <p className="font-medium">
                  <span className="text-muted-foreground mr-2">{entry.step}.</span>
                  {entry.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.location}, {entry.country}
                  {view === 'customs' && entry.date && ` \u2014 ${formatDate(entry.date, locale)}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
