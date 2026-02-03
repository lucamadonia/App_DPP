import { formatDate } from '@/lib/format';
import {
  BookOpen,
  Video,
  MessageSquare,
  Wrench,
  Package,
  ShieldCheck,
} from 'lucide-react';
import type { VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { RATING_DESCRIPTIONS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { SafeHtml } from '@/components/ui/safe-html';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
}

export function TemplateAccessible({ product, visibilityV2, view, dppDesign }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <AccessibleCustomsView data={data} />;
  }

  return <AccessibleConsumerView data={data} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
}

function AccessibleConsumerView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale, consumerSections } = data;

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
        <DPPSetComponentsSection key="components" components={product.components} t={t} />
      ) : null;
      default: return null;
    }
  };

  const renderMaterials = () => {
    return (
      <section key="materials" aria-label={t('Material Composition')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Material Composition')}
        </h2>
        <div className="space-y-4">
          {getProductMaterials(product).map((material, index) => (
            <div key={index} className="border-2 border-gray-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-gray-900">{material.name}</span>
                <span className="text-xl font-bold text-gray-900">{material.percentage}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={material.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${material.name}: ${material.percentage}%`}>
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{ width: `${material.percentage}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-lg">
                <span className={material.recyclable ? 'text-green-800 font-bold' : 'text-gray-600'}>
                  {material.recyclable ? t('Recyclable') : t('Not Recyclable')}
                </span>
                {isFieldVisible('materialOrigins') && material.origin && (
                  <span className="text-gray-700">{t('Origin')}: {material.origin}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderPackaging = () => {
    const packagingMats = getPackagingMaterials(product);
    return (
      <div key="packaging" className="p-6 sm:p-8" role="region" aria-label={t('Packaging Materials')}>
        <h2 className="text-xl mb-4">{t('Packaging Materials')}</h2>
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <ul className="space-y-3" role="list">
            {packagingMats.map((m, i) => (
              <li key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium text-base">{m.name}</span>
                  {m.recyclable && (
                    <span className="ml-2 text-sm text-green-700 dark:text-green-400" aria-label={t('Recyclable')}>{'\u267B'} {t('Recyclable')}</span>
                  )}
                  {isFieldVisible('materialOrigins') && m.origin && (
                    <p className="text-sm text-muted-foreground mt-0.5">{t('Origin')}: {m.origin}</p>
                  )}
                </div>
                <span className="font-bold text-lg" aria-label={`${m.percentage} percent`}>{m.percentage}%</span>
              </li>
            ))}
          </ul>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-base">{t('Packaging recyclable')}</span>
            <span className="font-bold text-lg">{product.recyclability.packagingRecyclablePercentage}%</span>
          </div>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="font-medium mb-1">{t('Packaging Recycling')}</p>
            <SafeHtml html={product.recyclability.packagingInstructions} className="text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  const renderCarbonFootprint = () => {
    return (
      <section key="carbonFootprint" aria-label={t('Carbon Footprint')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Carbon Footprint')}
        </h2>
        <div className="space-y-4">
          <div className="border-2 border-gray-400 rounded-lg p-6 text-center">
            <p className="text-5xl font-bold text-gray-900" aria-label={`${t('CO2 Rating')}: ${product.carbonFootprint!.rating}`}>
              {product.carbonFootprint!.rating}
            </p>
            <p className="text-lg text-gray-700 mt-2">{t(RATING_DESCRIPTIONS[product.carbonFootprint!.rating])}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint!.totalKgCO2}</p>
              <p className="text-lg text-gray-700">{t('kg CO2 Total')}</p>
            </div>
            <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint!.productionKgCO2}</p>
              <p className="text-lg text-gray-700">{t('kg CO2 Production')}</p>
            </div>
            <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint!.transportKgCO2}</p>
              <p className="text-lg text-gray-700">{t('kg CO2 Transport')}</p>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderRecycling = () => {
    return (
      <section key="recycling" aria-label={t('Recycling & Disposal')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Recycling & Disposal')}
        </h2>
        <div className="space-y-4">
          <div className="border-2 border-gray-400 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-700">{t('Recyclable')}:</span>
              <span className="text-3xl font-bold text-gray-900">{product.recyclability.recyclablePercentage}%</span>
            </div>
            <div className="mt-3 h-4 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={product.recyclability.recyclablePercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${t('Recyclable')}: ${product.recyclability.recyclablePercentage}%`}>
              <div
                className="h-full bg-gray-900 rounded-full"
                style={{ width: `${product.recyclability.recyclablePercentage}%` }}
              />
            </div>
          </div>
          {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('Recycling Instructions')}</h3>
              <SafeHtml html={product.recyclability.instructions} className="text-lg text-gray-800 leading-relaxed" />
            </div>
          )}
          {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('Disposal Methods')}</h3>
              <ul className="list-disc list-inside text-lg text-gray-800 space-y-2">
                {product.recyclability.disposalMethods.map((method, index) => (
                  <li key={index}>{method}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    return (
      <section key="certifications" aria-label={t('Certifications')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Certifications')}
        </h2>
        <div className="space-y-4">
          {product.certifications.map((cert, index) => (
            <div key={index} className="border-2 border-gray-400 rounded-lg p-5">
              <p className="text-xl font-bold text-gray-900">{cert.name}</p>
              <p className="text-lg text-gray-700 mt-1">{cert.issuedBy}</p>
              <p className="text-lg text-gray-600 mt-1">
                {t('Valid until')} {formatDate(cert.validUntil, locale)}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderSupplyChain = () => {
    return (
      <section key="supplyChain" aria-label={t('Supply Chain')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Supply Chain')}
        </h2>
        <ol className="space-y-4">
          {product.supplyChain.map((entry, index) => (
            <li key={index} className="border-2 border-gray-400 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white text-lg font-bold flex items-center justify-center" aria-label={`${t('Step')} ${entry.step}`}>
                  {entry.step}
                </span>
                <div className="flex-1">
                  <p className="text-xl font-bold text-gray-900">{entry.description}</p>
                  <p className="text-lg text-gray-700">{entry.location}, {entry.country}</p>
                  {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                    <p className="text-lg text-gray-700 mt-1" aria-label={`${t('Emissions')}: ${entry.emissionsKg} kg CO2`}>
                      {entry.emissionsKg} kg CO2
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  };

  const renderSupport = () => {
    const sr = product.supportResources!;
    return (
      <section key="support" aria-label={t('Support & Service')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Support & Service')}
        </h2>
        <p className="text-lg text-gray-700 mb-6">{t('Customer support and product resources')}</p>
        <div className="space-y-6">
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="space-y-4">
              {sr.instructions && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                    {t('Usage Instructions')}
                  </h3>
                  <SafeHtml html={sr.instructions} className="text-lg text-gray-800 leading-relaxed" />
                </div>
              )}
              {sr.assemblyGuide && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                    {t('Assembly Guide')}
                  </h3>
                  <SafeHtml html={sr.assemblyGuide} className="text-lg text-gray-800 leading-relaxed" />
                </div>
              )}
            </div>
          )}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="h-6 w-6" aria-hidden="true" />
                {t('Videos')}
              </h3>
              <ul className="space-y-3">
                {sr.videos.map((v, i) => (
                  <li key={i}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-blue-900 underline underline-offset-4 hover:text-blue-700 flex items-center gap-2" aria-label={v.title}>
                      <Video className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      {v.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-6 w-6" aria-hidden="true" />
                {t('FAQ')}
              </h3>
              <dl className="space-y-4">
                {sr.faq.map((item, i) => (
                  <div key={i} className="border-b-2 border-gray-300 pb-4">
                    <dt className="text-lg font-bold text-gray-900">{item.question}</dt>
                    <SafeHtml html={item.answer} className="text-lg text-gray-800 mt-1" />
                  </div>
                ))}
              </dl>
            </div>
          )}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                {t('Warranty')}
              </h3>
              <dl className="space-y-3">
                {sr.warranty.durationMonths != null && (
                  <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                    <dt className="text-lg font-bold text-gray-700">{t('Warranty Duration')}</dt>
                    <dd className="text-lg text-gray-900">{t('{{months}} months', { months: sr.warranty.durationMonths })}</dd>
                  </div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                    <dt className="text-lg font-bold text-gray-700">{t('Contact Email')}</dt>
                    <dd className="text-lg text-gray-900">{sr.warranty.contactEmail}</dd>
                  </div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                    <dt className="text-lg font-bold text-gray-700">{t('Contact Phone')}</dt>
                    <dd className="text-lg text-gray-900">{sr.warranty.contactPhone}</dd>
                  </div>
                )}
                {sr.warranty.terms && (
                  <div className="border-b-2 border-gray-300 py-3">
                    <dt className="text-lg font-bold text-gray-700">{t('Warranty Terms')}</dt>
                    <SafeHtml html={sr.warranty.terms} className="text-lg text-gray-800 mt-1 leading-relaxed" />
                  </div>
                )}
              </dl>
            </div>
          )}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Wrench className="h-6 w-6" aria-hidden="true" />
                {t('Repair Information')}
              </h3>
              <div className="space-y-4">
                {sr.repairInfo.repairGuide && (
                  <div className="border-b-2 border-gray-300 pb-3">
                    <p className="text-lg font-bold text-gray-700">{t('Repair Guide')}</p>
                    <SafeHtml html={sr.repairInfo.repairGuide} className="text-lg text-gray-800 mt-1 leading-relaxed" />
                  </div>
                )}
                {sr.repairInfo.repairabilityScore != null && (
                  <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                    <span className="text-lg font-bold text-gray-700">{t('Repairability Score')}</span>
                    <span className="text-2xl font-bold text-gray-900" aria-label={`${t('Repairability Score')}: ${sr.repairInfo.repairabilityScore} / 10`}>
                      {sr.repairInfo.repairabilityScore}/10
                    </span>
                  </div>
                )}
                {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                  <div>
                    <p className="text-lg font-bold text-gray-700 mb-2">{t('Service Centers')}</p>
                    <ul className="list-disc list-inside text-lg text-gray-800 space-y-2">
                      {sr.repairInfo.serviceCenters.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-6 w-6" aria-hidden="true" />
                {t('Spare Parts')}
              </h3>
              <div className="space-y-4">
                {sr.spareParts.map((part, i) => (
                  <div key={i} className="border-2 border-gray-400 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-gray-900">{part.name}</span>
                      <span className={`text-lg font-bold ${part.available !== false ? 'text-green-800' : 'text-red-800'}`}>
                        {part.available !== false ? t('Available') : t('Out of stock')}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-6 mt-2 text-lg text-gray-700">
                      {part.partNumber && <span>{t('Part Number')}: {part.partNumber}</span>}
                      {part.price != null && <span>{part.price} {part.currency || 'â‚¬'}</span>}
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
    <div className="max-w-3xl mx-auto px-6 py-10 bg-white text-gray-900 space-y-10">
      {/* Product Header */}
      <header className="space-y-4 border-b-4 border-gray-900 pb-6">
        {isFieldVisible('image') && product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover rounded-lg border-4 border-gray-900"
          />
        )}
        {isFieldVisible('name') && (
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>
        )}
        {isFieldVisible('manufacturer') && (
          <p className="text-xl text-gray-700">{product.manufacturer}</p>
        )}
        {isFieldVisible('category') && (
          <p
            className="inline-block bg-gray-900 text-white text-lg font-bold px-4 py-2 rounded"
            aria-label={`${t('Category')}: ${product.category}`}
          >
            {product.category}
          </p>
        )}
        {isFieldVisible('description') && product.description && (
          <SafeHtml html={product.description} className="text-lg text-gray-800 leading-relaxed" />
        )}
      </header>

      {consumerSections.map(s => renderSection(s))}
    </div>
  );
}

function AccessibleCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale } = data;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 bg-white text-gray-900 space-y-10">
      {/* Product Header */}
      <header className="space-y-4 border-b-4 border-gray-900 pb-6">
        {isFieldVisible('image') && product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover rounded-lg border-4 border-gray-900"
          />
        )}
        {isFieldVisible('name') && (
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>
        )}
        {isFieldVisible('manufacturer') && (
          <p className="text-xl text-gray-700">{product.manufacturer}</p>
        )}
        {isFieldVisible('category') && (
          <p
            className="inline-block bg-gray-900 text-white text-lg font-bold px-4 py-2 rounded"
            aria-label={`${t('Category')}: ${product.category}`}
          >
            {product.category}
          </p>
        )}
        {isFieldVisible('description') && product.description && (
          <SafeHtml html={product.description} className="text-lg text-gray-800 leading-relaxed" />
        )}
      </header>

      {/* Identifiers */}
      <section aria-label={t('Product Data')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Product Data')}
        </h2>
        <dl className="space-y-3">
          {isFieldVisible('gtin') && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">GTIN</dt>
              <dd className="text-lg font-mono text-gray-900">{product.gtin}</dd>
            </div>
          )}
          {isFieldVisible('serialNumber') && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Serial Number')}</dt>
              <dd className="text-lg font-mono text-gray-900">{product.serialNumber}</dd>
            </div>
          )}
          {isFieldVisible('batchNumber') && product.batchNumber && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Batch Number')}</dt>
              <dd className="text-lg font-mono text-gray-900">{product.batchNumber}</dd>
            </div>
          )}
          {isFieldVisible('hsCode') && product.hsCode && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('HS Code')}</dt>
              <dd className="text-lg font-mono text-gray-900">{product.hsCode}</dd>
            </div>
          )}
          {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Country of Origin')}</dt>
              <dd className="text-lg text-gray-900">{product.countryOfOrigin}</dd>
            </div>
          )}
          {isFieldVisible('netWeight') && product.netWeight && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Net Weight')}</dt>
              <dd className="text-lg text-gray-900">{product.netWeight} g</dd>
            </div>
          )}
          {isFieldVisible('grossWeight') && product.grossWeight && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Gross Weight')}</dt>
              <dd className="text-lg text-gray-900">{product.grossWeight} g</dd>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
            <dt className="text-lg font-bold text-gray-700">{t('Production Date')}</dt>
            <dd className="text-lg text-gray-900">{formatDate(product.productionDate, locale)}</dd>
          </div>
        </dl>
      </section>

      {/* Manufacturer Data */}
      <section aria-label={t('Manufacturer Data')}>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
          {t('Manufacturer Data')}
        </h2>
        <dl className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
            <dt className="text-lg font-bold text-gray-700">{t('Company')}</dt>
            <dd className="text-lg text-gray-900">{product.manufacturer}</dd>
          </div>
          {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('Address')}</dt>
              <dd className="text-lg text-gray-900">{product.manufacturerAddress}</dd>
            </div>
          )}
          {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('EORI Number')}</dt>
              <dd className="text-lg font-mono text-gray-900">{product.manufacturerEORI}</dd>
            </div>
          )}
          {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
            <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
              <dt className="text-lg font-bold text-gray-700">{t('VAT ID')}</dt>
              <dd className="text-lg font-mono text-gray-900">{product.manufacturerVAT}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <section aria-label={t('Material Composition')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {t('Material Composition')}
          </h2>
          <div className="space-y-4">
            {product.materials.map((material, index) => (
              <div key={index} className="border-2 border-gray-400 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-gray-900">{material.name}</span>
                  <span className="text-xl font-bold text-gray-900">{material.percentage}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={material.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${material.name}: ${material.percentage}%`}>
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: `${material.percentage}%` }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-lg">
                  <span className={material.recyclable ? 'text-green-800 font-bold' : 'text-gray-600'}>
                    {material.recyclable ? t('Recyclable') : t('Not Recyclable')}
                  </span>
                  {isFieldVisible('materialOrigins') && material.origin && (
                    <span className="text-gray-700">{t('Origin')}: {material.origin}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Carbon Footprint */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <section aria-label={t('Carbon Footprint')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {t('Carbon Footprint')}
          </h2>
          <div className="space-y-4">
            <div className="border-2 border-gray-400 rounded-lg p-6 text-center">
              <p className="text-5xl font-bold text-gray-900" aria-label={`${t('CO2 Rating')}: ${product.carbonFootprint.rating}`}>
                {product.carbonFootprint.rating}
              </p>
              <p className="text-lg text-gray-700 mt-2">{t(RATING_DESCRIPTIONS[product.carbonFootprint.rating])}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-lg text-gray-700">{t('kg CO2 Total')}</p>
              </div>
              <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-lg text-gray-700">{t('kg CO2 Production')}</p>
              </div>
              <div className="border-2 border-gray-400 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{product.carbonFootprint.transportKgCO2}</p>
                <p className="text-lg text-gray-700">{t('kg CO2 Transport')}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recyclability */}
      {isFieldVisible('recyclability') && (
        <section aria-label={t('Recycling & Disposal')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {t('Recycling & Disposal')}
          </h2>
          <div className="space-y-4">
            <div className="border-2 border-gray-400 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-700">{t('Recyclable')}:</span>
                <span className="text-3xl font-bold text-gray-900">{product.recyclability.recyclablePercentage}%</span>
              </div>
              <div className="mt-3 h-4 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={product.recyclability.recyclablePercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${t('Recyclable')}: ${product.recyclability.recyclablePercentage}%`}>
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{ width: `${product.recyclability.recyclablePercentage}%` }}
                />
              </div>
            </div>
            {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
              <div className="border-2 border-gray-400 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('Recycling Instructions')}</h3>
                <SafeHtml html={product.recyclability.instructions} className="text-lg text-gray-800 leading-relaxed" />
              </div>
            )}
            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="border-2 border-gray-400 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('Disposal Methods')}</h3>
                <ul className="list-disc list-inside text-lg text-gray-800 space-y-2">
                  {product.recyclability.disposalMethods.map((method, index) => (
                    <li key={index}>{method}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Certifications */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <section aria-label={t('Certifications')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {t('Certifications')}
          </h2>
          <div className="space-y-4">
            {product.certifications.map((cert, index) => (
              <div key={index} className="border-2 border-gray-400 rounded-lg p-5">
                <p className="text-xl font-bold text-gray-900">{cert.name}</p>
                <p className="text-lg text-gray-700 mt-1">{cert.issuedBy}</p>
                <p className="text-lg text-gray-600 mt-1">
                  {t('Valid until')} {formatDate(cert.validUntil, locale)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Supply Chain */}
      {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
        <section aria-label={t('Full Supply Chain')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {t('Full Supply Chain')}
          </h2>
          <ol className="space-y-4">
            {product.supplyChain.map((entry, index) => (
              <li key={index} className="border-2 border-gray-400 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white text-lg font-bold flex items-center justify-center" aria-label={`${t('Step')} ${entry.step}`}>
                    {entry.step}
                  </span>
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900">{entry.description}</p>
                    <p className="text-lg text-gray-700">{entry.location}, {entry.country}</p>
                    {entry.date && (
                      <p className="text-lg text-gray-600">{formatDate(entry.date, locale)}</p>
                    )}
                    {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                      <p className="text-lg text-gray-700 mt-1" aria-label={`${t('Emissions')}: ${entry.emissionsKg} kg CO2`}>
                        {entry.emissionsKg} kg CO2
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Support & Service */}
      {isFieldVisible('supportResources') && product.supportResources && (() => {
        const sr = product.supportResources!;
        const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
        if (!hasContent) return null;
        return (
          <section aria-label={t('Support & Service')}>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
              {t('Support & Service')}
            </h2>
            <p className="text-lg text-gray-700 mb-6">{t('Customer support and product resources')}</p>
            <div className="space-y-6">
              {(sr.instructions || sr.assemblyGuide) && (
                <div className="space-y-4">
                  {sr.instructions && (
                    <div className="border-2 border-gray-400 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen className="h-6 w-6" aria-hidden="true" />
                        {t('Usage Instructions')}
                      </h3>
                      <SafeHtml html={sr.instructions} className="text-lg text-gray-800 leading-relaxed" />
                    </div>
                  )}
                  {sr.assemblyGuide && (
                    <div className="border-2 border-gray-400 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen className="h-6 w-6" aria-hidden="true" />
                        {t('Assembly Guide')}
                      </h3>
                      <SafeHtml html={sr.assemblyGuide} className="text-lg text-gray-800 leading-relaxed" />
                    </div>
                  )}
                </div>
              )}
              {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Video className="h-6 w-6" aria-hidden="true" />
                    {t('Videos')}
                  </h3>
                  <ul className="space-y-3">
                    {sr.videos.map((v, i) => (
                      <li key={i}>
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-blue-900 underline underline-offset-4 hover:text-blue-700 flex items-center gap-2" aria-label={v.title}>
                          <Video className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          {v.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-6 w-6" aria-hidden="true" />
                    {t('FAQ')}
                  </h3>
                  <dl className="space-y-4">
                    {sr.faq.map((item, i) => (
                      <div key={i} className="border-b-2 border-gray-300 pb-4">
                        <dt className="text-lg font-bold text-gray-900">{item.question}</dt>
                        <SafeHtml html={item.answer} className="text-lg text-gray-800 mt-1" />
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {isFieldVisible('supportWarranty') && sr.warranty && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    {t('Warranty')}
                  </h3>
                  <dl className="space-y-3">
                    {sr.warranty.durationMonths != null && (
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                        <dt className="text-lg font-bold text-gray-700">{t('Warranty Duration')}</dt>
                        <dd className="text-lg text-gray-900">{t('{{months}} months', { months: sr.warranty.durationMonths })}</dd>
                      </div>
                    )}
                    {sr.warranty.contactEmail && (
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                        <dt className="text-lg font-bold text-gray-700">{t('Contact Email')}</dt>
                        <dd className="text-lg text-gray-900">{sr.warranty.contactEmail}</dd>
                      </div>
                    )}
                    {sr.warranty.contactPhone && (
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                        <dt className="text-lg font-bold text-gray-700">{t('Contact Phone')}</dt>
                        <dd className="text-lg text-gray-900">{sr.warranty.contactPhone}</dd>
                      </div>
                    )}
                    {sr.warranty.terms && (
                      <div className="border-b-2 border-gray-300 py-3">
                        <dt className="text-lg font-bold text-gray-700">{t('Warranty Terms')}</dt>
                        <SafeHtml html={sr.warranty.terms} className="text-lg text-gray-800 mt-1 leading-relaxed" />
                      </div>
                    )}
                  </dl>
                </div>
              )}
              {isFieldVisible('supportRepair') && sr.repairInfo && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Wrench className="h-6 w-6" aria-hidden="true" />
                    {t('Repair Information')}
                  </h3>
                  <div className="space-y-4">
                    {sr.repairInfo.repairGuide && (
                      <div className="border-b-2 border-gray-300 pb-3">
                        <p className="text-lg font-bold text-gray-700">{t('Repair Guide')}</p>
                        <SafeHtml html={sr.repairInfo.repairGuide} className="text-lg text-gray-800 mt-1 leading-relaxed" />
                      </div>
                    )}
                    {sr.repairInfo.repairabilityScore != null && (
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-gray-300 py-3">
                        <span className="text-lg font-bold text-gray-700">{t('Repairability Score')}</span>
                        <span className="text-2xl font-bold text-gray-900" aria-label={`${t('Repairability Score')}: ${sr.repairInfo.repairabilityScore} / 10`}>
                          {sr.repairInfo.repairabilityScore}/10
                        </span>
                      </div>
                    )}
                    {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                      <div>
                        <p className="text-lg font-bold text-gray-700 mb-2">{t('Service Centers')}</p>
                        <ul className="list-disc list-inside text-lg text-gray-800 space-y-2">
                          {sr.repairInfo.serviceCenters.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                <div className="border-2 border-gray-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-6 w-6" aria-hidden="true" />
                    {t('Spare Parts')}
                  </h3>
                  <div className="space-y-4">
                    {sr.spareParts.map((part, i) => (
                      <div key={i} className="border-2 border-gray-400 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-gray-900">{part.name}</span>
                          <span className={`text-lg font-bold ${part.available !== false ? 'text-green-800' : 'text-red-800'}`}>
                            {part.available !== false ? t('Available') : t('Out of stock')}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-6 mt-2 text-lg text-gray-700">
                          {part.partNumber && <span>{t('Part Number')}: {part.partNumber}</span>}
                          {part.price != null && <span>{part.price} {part.currency || 'â‚¬'}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
