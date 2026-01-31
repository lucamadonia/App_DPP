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

const ratingDescriptions: Record<string, string> = {
  A: 'Excellent - well below average',
  B: 'Good - below average',
  C: 'Average',
  D: 'Above average',
  E: 'Well above average',
};

export function TemplateAccessible({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
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
          <p className="text-lg text-gray-800 leading-relaxed">{product.description}</p>
        )}
      </header>

      {/* Identifiers */}
      {view === 'customs' && (
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
      )}

      {/* Manufacturer Data (customs) */}
      {view === 'customs' && (
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
      )}

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
              <p className="text-lg text-gray-700 mt-2">{t(ratingDescriptions[product.carbonFootprint.rating])}</p>
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
                <p className="text-lg text-gray-800 leading-relaxed">{product.recyclability.instructions}</p>
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
      {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
        <section aria-label={view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-4 border-gray-900 pb-2">
            {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
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
                    {view === 'customs' && entry.date && (
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
    </div>
  );
}
