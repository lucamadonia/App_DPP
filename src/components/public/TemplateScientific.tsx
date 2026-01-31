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

export function TemplateScientific({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  let sectionNumber = 0;
  const nextSection = () => {
    sectionNumber += 1;
    return sectionNumber;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title Block */}
      <header className="border-b-2 border-gray-300 pb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-6">
          {isFieldVisible('image') && product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full md:w-48 h-48 object-cover rounded border border-gray-300"
            />
          )}
          <div className="flex-1">
            {isFieldVisible('name') && (
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            )}
            {isFieldVisible('manufacturer') && (
              <p className="text-gray-600 mt-1">{product.manufacturer}</p>
            )}
            {isFieldVisible('category') && (
              <p className="text-sm text-gray-500 mt-1">{product.category}</p>
            )}

            {/* Metadata table */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {isFieldVisible('gtin') && (
                <>
                  <span className="text-gray-500">GTIN:</span>
                  <span className="font-mono">{product.gtin}</span>
                </>
              )}
              {isFieldVisible('serialNumber') && (
                <>
                  <span className="text-gray-500">{t('Serial Number')}:</span>
                  <span className="font-mono">{product.serialNumber}</span>
                </>
              )}
              {view === 'customs' && isFieldVisible('batchNumber') && product.batchNumber && (
                <>
                  <span className="text-gray-500">{t('Batch Number')}:</span>
                  <span className="font-mono">{product.batchNumber}</span>
                </>
              )}
              {view === 'customs' && isFieldVisible('hsCode') && product.hsCode && (
                <>
                  <span className="text-gray-500">{t('HS Code')}:</span>
                  <span className="font-mono">{product.hsCode}</span>
                </>
              )}
              <span className="text-gray-500">{t('Production Date')}:</span>
              <span>{formatDate(product.productionDate, locale)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Abstract / Description */}
      {isFieldVisible('description') && product.description && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {nextSection()}. {t('Description')}
          </h2>
          <p className="text-gray-700 leading-relaxed max-w-none">{product.description}</p>
        </section>
      )}

      {/* Customs Data */}
      {view === 'customs' && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Customs Data')}
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">
                {t('Product Data')}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('Country of Origin')}</td>
                      <td className="py-1.5 text-right">{product.countryOfOrigin}</td>
                    </tr>
                  )}
                  {isFieldVisible('netWeight') && product.netWeight && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('Net Weight')}</td>
                      <td className="py-1.5 text-right">{product.netWeight} g</td>
                    </tr>
                  )}
                  {isFieldVisible('grossWeight') && product.grossWeight && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('Gross Weight')}</td>
                      <td className="py-1.5 text-right">{product.grossWeight} g</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">{t('Production Date')}</td>
                    <td className="py-1.5 text-right">{formatDate(product.productionDate, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">
                {t('Manufacturer Data')}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500">{t('Company')}</td>
                    <td className="py-1.5 text-right">{product.manufacturer}</td>
                  </tr>
                  {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('Address')}</td>
                      <td className="py-1.5 text-right text-xs">{product.manufacturerAddress}</td>
                    </tr>
                  )}
                  {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('EORI Number')}</td>
                      <td className="py-1.5 text-right font-mono">{product.manufacturerEORI}</td>
                    </tr>
                  )}
                  {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{t('VAT ID')}</td>
                      <td className="py-1.5 text-right font-mono">{product.manufacturerVAT}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Material Composition')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('Materials used and their origins')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Material')}</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Share')} (%)</th>
                  <th className="py-2 px-3 text-center font-semibold text-gray-700 border-b border-gray-200">{t('Recyclable')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Origin')}</th>
                </tr>
              </thead>
              <tbody>
                {product.materials.map((material, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium">{material.name}</td>
                    <td className="py-2 px-3 text-right font-mono">{material.percentage}</td>
                    <td className="py-2 px-3 text-center">{material.recyclable ? t('Yes') : t('No')}</td>
                    <td className="py-2 px-3 text-gray-600">{material.origin || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Carbon Footprint */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Carbon Footprint')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('Climate impact across the product lifecycle')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Metric')}</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Value')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">{t('Total')} CO2</td>
                  <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint.totalKgCO2} kg</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">{t('Production')} CO2</td>
                  <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint.productionKgCO2} kg</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">{t('Transport')} CO2</td>
                  <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint.transportKgCO2} kg</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">{t('CO2 Rating')}</td>
                  <td className="py-2 px-3 text-right font-bold">{product.carbonFootprint.rating} &mdash; {t(ratingDescriptions[product.carbonFootprint.rating])}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recyclability */}
      {isFieldVisible('recyclability') && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Recycling & Disposal')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('Guide for environmentally friendly disposal')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Recyclable')}</td>
                  <td className="py-2 px-3 font-mono">{product.recyclability.recyclablePercentage}%</td>
                </tr>
                {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Recycling Instructions')}</td>
                    <td className="py-2 px-3 text-gray-700">{product.recyclability.instructions}</td>
                  </tr>
                )}
                {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Disposal Methods')}</td>
                    <td className="py-2 px-3 text-gray-700">{product.recyclability.disposalMethods.join(', ')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Certifications */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Certifications')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('Verified quality and sustainability standards')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Certifications')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Issued By')}</th>
                  <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Valid until')}</th>
                </tr>
              </thead>
              <tbody>
                {product.certifications.map((cert, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                    <td className="py-2 px-3 font-medium">{cert.name}</td>
                    <td className="py-2 px-3 text-gray-600">{cert.issuedBy}</td>
                    <td className="py-2 px-3 text-right">{formatDate(cert.validUntil, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Supply Chain */}
      {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('The journey of your product from raw material to you')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Step')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Description')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Location')}</th>
                  {view === 'customs' && (
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Date')}</th>
                  )}
                  {view === 'customs' && isFieldVisible('supplyChainTransport') && (
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Transport Mode')}</th>
                  )}
                  {isFieldVisible('supplyChainEmissions') && (
                    <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Emissions')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {product.supplyChain.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-mono">{entry.step}</td>
                    <td className="py-2 px-3">{entry.description}</td>
                    <td className="py-2 px-3 text-gray-600">{entry.location}, {entry.country}</td>
                    {view === 'customs' && (
                      <td className="py-2 px-3">{formatDate(entry.date, locale)}</td>
                    )}
                    {view === 'customs' && isFieldVisible('supplyChainTransport') && (
                      <td className="py-2 px-3">{entry.transportMode ? t(entry.transportMode.charAt(0).toUpperCase() + entry.transportMode.slice(1)) : '-'}</td>
                    )}
                    {isFieldVisible('supplyChainEmissions') && (
                      <td className="py-2 px-3 text-right font-mono">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* References / Footer */}
      <footer className="border-t-2 border-gray-300 pt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {nextSection()}. {t('References')}
        </h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>[1] {t('Digital Product Passport')} &mdash; GTIN: {product.gtin}</p>
          <p>[2] {t('Production Date')}: {formatDate(product.productionDate, locale)}</p>
          {product.manufacturer && (
            <p>[3] {t('Manufacturer Data')}: {product.manufacturer}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
