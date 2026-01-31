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

export function TemplateGovernment({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Document Header */}
      <div className="border-2 border-gray-800 p-6 sm:p-8">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{t('Digital Product Passport')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('Official Product Documentation')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            {isFieldVisible('image') && product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-24 h-24 object-cover border-2 border-gray-400 flex-shrink-0"
              />
            )}
            <div>
              {isFieldVisible('name') && (
                <h2 className="text-xl font-bold">{product.name}</h2>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-sm text-gray-600">{product.manufacturer}</p>
              )}
              {isFieldVisible('category') && (
                <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{product.category}</p>
              )}
            </div>
          </div>

          {/* Reference numbers block */}
          <div className="border-2 border-gray-300 bg-gray-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">{t('Reference Numbers')}</h3>
            <div className="space-y-2">
              {isFieldVisible('gtin') && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GTIN:</span>
                  <span className="font-mono font-bold">{product.gtin}</span>
                </div>
              )}
              {isFieldVisible('serialNumber') && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Serial Number')}:</span>
                  <span className="font-mono font-bold">{product.serialNumber}</span>
                </div>
              )}
              {view === 'customs' && isFieldVisible('batchNumber') && product.batchNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Batch Number')}:</span>
                  <span className="font-mono font-bold">{product.batchNumber}</span>
                </div>
              )}
              {view === 'customs' && isFieldVisible('hsCode') && product.hsCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('HS Code')}:</span>
                  <span className="font-mono font-bold">{product.hsCode}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('Production Date')}:</span>
                <span className="font-mono">{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>
          </div>
        </div>

        {isFieldVisible('description') && product.description && (
          <div className="mt-6 pt-4 border-t-2 border-gray-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t('Description')}</h3>
            <p className="text-sm text-gray-700">{product.description}</p>
          </div>
        )}
      </div>

      {/* Customs Data Section */}
      {view === 'customs' && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Customs Data')}</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 pb-1 border-b-2 border-gray-300">
                  {t('Product Data')}
                </h3>
                {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Country of Origin')}:</span>
                    <span className="font-medium">{product.countryOfOrigin}</span>
                  </div>
                )}
                {isFieldVisible('netWeight') && product.netWeight && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Net Weight')}:</span>
                    <span className="font-medium">{product.netWeight} g</span>
                  </div>
                )}
                {isFieldVisible('grossWeight') && product.grossWeight && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Gross Weight')}:</span>
                    <span className="font-medium">{product.grossWeight} g</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 pb-1 border-b-2 border-gray-300">
                  {t('Manufacturer Data')}
                </h3>
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                  <span className="text-gray-600">{t('Company')}:</span>
                  <span className="font-medium">{product.manufacturer}</span>
                </div>
                {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Address')}:</span>
                    <span className="font-medium text-right text-xs">{product.manufacturerAddress}</span>
                  </div>
                )}
                {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('EORI Number')}:</span>
                    <span className="font-mono font-medium">{product.manufacturerEORI}</span>
                  </div>
                )}
                {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('VAT ID')}:</span>
                    <span className="font-mono font-medium">{product.manufacturerVAT}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materials Section */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Material Composition')}</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Material')}</th>
                    <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Share')}</th>
                    <th className="py-2 text-center font-bold text-xs uppercase tracking-wider text-gray-600">{t('Recyclable')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Origin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.materials.map((material, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 font-medium">{material.name}</td>
                      <td className="py-2 text-right font-mono">{material.percentage}%</td>
                      <td className="py-2 text-center">{material.recyclable ? t('Yes') : t('No')}</td>
                      <td className="py-2 text-gray-600">{material.origin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Carbon Footprint Section */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Carbon Footprint')}</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border-2 border-gray-300 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('CO2 Rating')}</p>
                <p className="text-3xl font-bold mt-1">{product.carbonFootprint.rating}</p>
              </div>
              <div className="border-2 border-gray-300 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('Total')}</p>
                <p className="text-xl font-bold mt-1">{product.carbonFootprint.totalKgCO2} kg</p>
              </div>
              <div className="border-2 border-gray-300 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('Production')}</p>
                <p className="text-xl font-bold mt-1">{product.carbonFootprint.productionKgCO2} kg</p>
              </div>
              <div className="border-2 border-gray-300 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">{t('Transport')}</p>
                <p className="text-xl font-bold mt-1">{product.carbonFootprint.transportKgCO2} kg</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recyclability Section */}
      {isFieldVisible('recyclability') && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Recycling & Disposal')}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="border-2 border-gray-300 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{t('Recyclable')}:</span>
                <span className="text-2xl font-bold">{product.recyclability.recyclablePercentage}%</span>
              </div>
            </div>
            {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
              <div className="border-2 border-gray-300 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t('Recycling Instructions')}</h4>
                <p className="text-sm text-gray-700">{product.recyclability.instructions}</p>
              </div>
            )}
            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="border-2 border-gray-300 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t('Disposal Methods')}</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {product.recyclability.disposalMethods.map((method, index) => (
                    <li key={index}>{method}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certifications Section */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Certifications')}</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Certifications')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Issued By')}</th>
                    <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Valid until')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.certifications.map((cert, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 font-medium">{cert.name}</td>
                      <td className="py-2 text-gray-600">{cert.issuedBy}</td>
                      <td className="py-2 text-right font-mono">{formatDate(cert.validUntil, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supply Chain Section */}
      {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">
              {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Step')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Description')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Location')}</th>
                    {view === 'customs' && (
                      <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Date')}</th>
                    )}
                    {isFieldVisible('supplyChainEmissions') && (
                      <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Emissions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 font-bold">{entry.step}</td>
                      <td className="py-2 font-medium">{entry.description}</td>
                      <td className="py-2 text-gray-600">{entry.location}, {entry.country}</td>
                      {view === 'customs' && (
                        <td className="py-2 font-mono">{formatDate(entry.date, locale)}</td>
                      )}
                      {isFieldVisible('supplyChainEmissions') && (
                        <td className="py-2 text-right">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Document footer stamp */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-300">
        {t('Digital Product Passport')} &mdash; {product.gtin}
      </div>
    </div>
  );
}
