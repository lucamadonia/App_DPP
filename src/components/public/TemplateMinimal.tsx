import { formatDate } from '@/lib/format';
import type { VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { SafeHtml } from '@/components/ui/safe-html';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
}

export function TemplateMinimal({ product, visibilityV2, view, dppDesign }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);
  const { product: p, isFieldVisible, t, locale, consumerSections, view: v, styles } = data;
  const { heading: headingStyle } = styles;

  const renderSection = (section: RenderableSection) => {
    switch (section.id) {
      case 'materials': return renderMaterials();
      case 'packaging': return renderPackaging();
      case 'carbonFootprint': return renderCarbonFootprint();
      case 'recycling': return renderRecycling();
      case 'certifications': return renderCertifications();
      case 'supplyChain': return renderSupplyChain();
      case 'support': return renderSupport();
      case 'components': return product.productType === 'set' && product.components?.length ? (
        <DPPSetComponentsSection key="components" components={product.components} cardStyle={styles.card} headingStyle={styles.heading} t={t} />
      ) : null;
      default: return null;
    }
  };

  const renderMaterials = () => (
    <section key="materials" className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('Material Composition')}</h2>
      <div className="space-y-4">
        {getProductMaterials(p).map((material, index) => (
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
  );

  const renderPackaging = () => {
    const packagingMats = getPackagingMaterials(p);
    return (
      <div key="packaging" className="space-y-4">
        <h2 style={headingStyle} className="text-lg">{t('Packaging')}</h2>
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <div className="space-y-2">
            {packagingMats.map((m, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{m.name}{m.recyclable ? ' \u267B' : ''}</span>
                <span className="font-medium">{m.percentage}%</span>
              </div>
            ))}
          </div>
        )}
        {isFieldVisible('packagingRecyclability') && p.recyclability?.packagingRecyclablePercentage != null && p.recyclability.packagingRecyclablePercentage > 0 && (
          <p className="text-sm">{t('Packaging recyclable')}: {p.recyclability.packagingRecyclablePercentage}%</p>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && p.recyclability?.packagingInstructions && (
          <SafeHtml html={p.recyclability.packagingInstructions} className="text-sm text-muted-foreground" />
        )}
      </div>
    );
  };

  const renderCarbonFootprint = () => (
    <section key="carbonFootprint" className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('Carbon Footprint')}</h2>
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-light">{p.carbonFootprint!.totalKgCO2}</span>
          <span className="text-muted-foreground">{t('kg CO2')}</span>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <span>{t('Production')}: {p.carbonFootprint!.productionKgCO2} kg</span>
          <span>{t('Transport')}: {p.carbonFootprint!.transportKgCO2} kg</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('CO2 Rating')}:</span>
          <span className="text-lg font-semibold">{p.carbonFootprint!.rating}</span>
        </div>
      </div>
    </section>
  );

  const renderRecycling = () => (
    <section key="recycling" className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('Recycling & Disposal')}</h2>
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-light">{p.recyclability.recyclablePercentage}%</span>
          <span className="text-muted-foreground">{t('Recyclable')}</span>
        </div>
        {isFieldVisible('recyclingInstructions') && p.recyclability.instructions && (
          <SafeHtml html={p.recyclability.instructions} className="text-sm text-muted-foreground leading-relaxed" />
        )}
        {isFieldVisible('disposalMethods') && p.recyclability.disposalMethods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {p.recyclability.disposalMethods.map((method, index) => (
              <span key={index} className="text-xs text-muted-foreground border-b border-dashed">
                {method}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const renderCertifications = () => (
    <section key="certifications" className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('Certifications')}</h2>
      <div className="space-y-4">
        {p.certifications.map((cert, index) => (
          <div key={index} className="py-2">
            <p className="font-medium">{cert.name}</p>
            <p className="text-sm text-muted-foreground">
              {cert.issuedBy} &middot; {t('Valid until')} {formatDate(cert.validUntil, locale)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderSupplyChain = () => (
    <section key="supplyChain" className="space-y-6">
      <h2 className="text-2xl font-semibold">
        {v === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
      </h2>
      <div className="space-y-6">
        {p.supplyChain.map((entry, index) => (
          <div key={index} className="space-y-1">
            <p className="font-medium">
              <span className="text-muted-foreground mr-2">{entry.step}.</span>
              {entry.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {entry.location}, {entry.country}
              {v === 'customs' && entry.date && ` \u2014 ${formatDate(entry.date, locale)}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderSupport = () => {
    const sr = p.supportResources!;
    return (
      <section key="support" className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">{t('Support & Service')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('Customer support and product resources')}</p>
        </div>
        <div className="space-y-10">
          {sr.instructions && (
            <div className="space-y-2">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Usage Instructions')}</h3>
              <SafeHtml html={sr.instructions} className="text-sm leading-relaxed text-foreground/80" />
            </div>
          )}
          {sr.assemblyGuide && (
            <div className="space-y-2">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Assembly Guide')}</h3>
              <SafeHtml html={sr.assemblyGuide} className="text-sm leading-relaxed text-foreground/80" />
            </div>
          )}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Videos')}</h3>
              <div className="space-y-2">
                {sr.videos.map((vid, i) => (
                  <a key={i} href={vid.url} target="_blank" rel="noopener noreferrer" className="block py-2 text-sm font-medium hover:underline underline-offset-4">
                    {vid.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('FAQ')}</h3>
              <div className="space-y-4">
                {sr.faq.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="font-medium text-sm">{item.question}</p>
                    <SafeHtml html={item.answer} className="text-sm text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Warranty')}</h3>
              <div className="space-y-3">
                {sr.warranty.durationMonths != null && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">{t('Warranty Duration')}</span>
                    <span>{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                  </div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">{t('Contact Email')}</span>
                    <span className="text-sm">{sr.warranty.contactEmail}</span>
                  </div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">{t('Contact Phone')}</span>
                    <span>{sr.warranty.contactPhone}</span>
                  </div>
                )}
                {sr.warranty.terms && (
                  <SafeHtml html={sr.warranty.terms} className="text-sm text-muted-foreground leading-relaxed" />
                )}
              </div>
            </div>
          )}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Repair Information')}</h3>
              <div className="space-y-3">
                {sr.repairInfo.repairGuide && (
                  <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm leading-relaxed text-foreground/80" />
                )}
                {sr.repairInfo.repairabilityScore != null && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light">{sr.repairInfo.repairabilityScore}</span>
                    <span className="text-muted-foreground">/10 {t('Repairability Score')}</span>
                  </div>
                )}
                {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('Service Centers')}</p>
                    {sr.repairInfo.serviceCenters.map((c, i) => (
                      <p key={i} className="text-sm text-foreground/80">{c}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground">{t('Spare Parts')}</h3>
              <div className="space-y-4">
                {sr.spareParts.map((part, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div>
                      <span className="font-medium text-sm">{part.name}</span>
                      {part.partNumber && (
                        <span className="ml-2 text-xs text-muted-foreground">{part.partNumber}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {part.price != null && <span className="text-sm font-light mr-3">{part.price} {part.currency || '\u20AC'}</span>}
                      <span className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'} border-b border-dashed`}>
                        {part.available !== false ? t('Available') : t('Out of stock')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 sm:py-20 space-y-16">
      {/* Product Header */}
      <header className="space-y-6">
        {isFieldVisible('image') && p.imageUrl && (
          <img
            src={p.imageUrl}
            alt={p.name}
            className="w-full h-64 sm:h-80 object-cover"
          />
        )}
        {isFieldVisible('name') && (
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            {p.name}
          </h1>
        )}
        {isFieldVisible('manufacturer') && (
          <p className="text-lg text-muted-foreground">{p.manufacturer}</p>
        )}
        {isFieldVisible('category') && (
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {p.category}
          </p>
        )}
        {isFieldVisible('description') && p.description && (
          <SafeHtml html={p.description} className="text-lg leading-relaxed text-foreground/80" />
        )}
      </header>

      {/* Identifiers (customs view) */}
      {v === 'customs' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('Product Data')}</h2>
          <div className="space-y-3">
            {isFieldVisible('gtin') && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">GTIN</span>
                <span className="font-mono">{p.gtin}</span>
              </div>
            )}
            {isFieldVisible('serialNumber') && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Serial Number')}</span>
                <span className="font-mono">{p.serialNumber}</span>
              </div>
            )}
            {isFieldVisible('batchNumber') && p.batchNumber && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Batch Number')}</span>
                <span className="font-mono">{p.batchNumber}</span>
              </div>
            )}
            {isFieldVisible('hsCode') && p.hsCode && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('HS Code')}</span>
                <span className="font-mono">{p.hsCode}</span>
              </div>
            )}
            {isFieldVisible('countryOfOrigin') && p.countryOfOrigin && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Country of Origin')}</span>
                <span>{p.countryOfOrigin}</span>
              </div>
            )}
            {isFieldVisible('netWeight') && p.netWeight && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Net Weight')}</span>
                <span>{p.netWeight} g</span>
              </div>
            )}
            {isFieldVisible('grossWeight') && p.grossWeight && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Gross Weight')}</span>
                <span>{p.grossWeight} g</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('Production Date')}</span>
              <span>{formatDate(p.productionDate, locale)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Manufacturer Data (customs view) */}
      {v === 'customs' && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('Manufacturer Data')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('Company')}</span>
              <span>{p.manufacturer}</span>
            </div>
            {isFieldVisible('manufacturerAddress') && p.manufacturerAddress && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('Address')}</span>
                <span className="text-right text-sm">{p.manufacturerAddress}</span>
              </div>
            )}
            {isFieldVisible('manufacturerEORI') && p.manufacturerEORI && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('EORI Number')}</span>
                <span className="font-mono">{p.manufacturerEORI}</span>
              </div>
            )}
            {isFieldVisible('manufacturerVAT') && p.manufacturerVAT && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('VAT ID')}</span>
                <span className="font-mono">{p.manufacturerVAT}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {consumerSections.map(s => renderSection(s))}
    </div>
  );
}
