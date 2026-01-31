import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Leaf,
  Recycle,
  MapPin,
} from 'lucide-react';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
}

const ratingColors: Record<string, string> = {
  A: 'bg-green-600',
  B: 'bg-green-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

export function TemplateEcoFriendly({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Green gradient header */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-1/3 flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-56 object-cover rounded-2xl shadow-lg"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-3xl sm:text-4xl font-bold">{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-green-200 flex items-center gap-2 justify-center md:justify-start">
                  <Leaf className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {isFieldVisible('category') && (
                <span className="inline-block bg-white/20 rounded-full px-4 py-1 text-sm">
                  {product.category}
                </span>
              )}
              {isFieldVisible('description') && product.description && (
                <p className="text-green-100 leading-relaxed">{product.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Sustainability Highlight -- always first */}
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold text-green-800">{t('Carbon Footprint')}</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className={`w-24 h-24 rounded-full ${ratingColors[product.carbonFootprint.rating]} text-white flex items-center justify-center text-4xl font-bold shadow-lg`}>
                {product.carbonFootprint.rating}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-3xl font-bold text-green-800">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
                <div className="flex gap-6 mt-2 justify-center sm:justify-start text-sm text-green-700">
                  <span>{t('Production')}: {product.carbonFootprint.productionKgCO2} kg</span>
                  <span>{t('Transport')}: {product.carbonFootprint.transportKgCO2} kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recyclability -- second priority */}
        {isFieldVisible('recyclability') && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <div className="flex items-center gap-2 mb-6">
              <Recycle className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold text-green-800">{t('Recycling & Disposal')}</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#dcfce7" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${product.recyclability.recyclablePercentage * 2.64} 264`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-700">{product.recyclability.recyclablePercentage}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-green-700 font-medium">{t('Recyclable')}</p>
                {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
                  <div className="bg-green-50 p-4 rounded-xl">
                    <p className="text-sm text-green-800">{product.recyclability.instructions}</p>
                  </div>
                )}
                {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.recyclability.disposalMethods.map((method, index) => (
                      <span key={index} className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                        {method}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Materials */}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-green-800 mb-6">{t('Material Composition')}</h2>
            <div className="space-y-4">
              {product.materials.map((material, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">{material.name}</span>
                      {material.recyclable && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          <Recycle className="h-3 w-3" />
                          {t('Recyclable')}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-green-700">{material.percentage}%</span>
                  </div>
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                      style={{ width: `${material.percentage}%` }}
                    />
                  </div>
                  {isFieldVisible('materialOrigins') && material.origin && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {t('Origin')}: {material.origin}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-green-800 mb-6">{t('Certifications')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {product.certifications.map((cert, index) => (
                <div key={index} className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="font-semibold text-green-900">{cert.name}</p>
                  <p className="text-sm text-green-700">{cert.issuedBy}</p>
                  <p className="text-xs text-green-600 mt-2">{t('Valid until')} {formatDate(cert.validUntil, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supply Chain */}
        {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-green-800 mb-6">
              {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
            </h2>
            <div className="space-y-0">
              {product.supplyChain.map((entry, index) => {
                const isLast = index === product.supplyChain.length - 1;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                        {entry.step}
                      </div>
                      {!isLast && <div className="w-0.5 h-10 bg-green-200" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium text-green-900">{entry.description}</p>
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {entry.location}, {entry.country}
                      </p>
                      {view === 'customs' && entry.date && (
                        <p className="text-xs text-green-500">{formatDate(entry.date, locale)}</p>
                      )}
                      {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <Leaf className="h-3 w-3" />
                          {entry.emissionsKg} kg CO2
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customs Data */}
        {view === 'customs' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-green-800 mb-6">{t('Customs Data')}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-700 mb-3">{t('Product Data')}</h3>
                {isFieldVisible('gtin') && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">GTIN</span>
                    <span className="font-mono text-green-900">{product.gtin}</span>
                  </div>
                )}
                {isFieldVisible('serialNumber') && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Serial Number')}</span>
                    <span className="font-mono text-green-900">{product.serialNumber}</span>
                  </div>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Batch Number')}</span>
                    <span className="font-mono text-green-900">{product.batchNumber}</span>
                  </div>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('HS Code')}</span>
                    <span className="font-mono text-green-900">{product.hsCode}</span>
                  </div>
                )}
                {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Country of Origin')}</span>
                    <span className="text-green-900">{product.countryOfOrigin}</span>
                  </div>
                )}
                {isFieldVisible('netWeight') && product.netWeight && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Net Weight')}</span>
                    <span className="text-green-900">{product.netWeight} g</span>
                  </div>
                )}
                {isFieldVisible('grossWeight') && product.grossWeight && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Gross Weight')}</span>
                    <span className="text-green-900">{product.grossWeight} g</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-700 mb-3">{t('Manufacturer Data')}</h3>
                <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                  <span className="text-green-600">{t('Company')}</span>
                  <span className="text-green-900">{product.manufacturer}</span>
                </div>
                {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Address')}</span>
                    <span className="text-right text-green-900 text-xs">{product.manufacturerAddress}</span>
                  </div>
                )}
                {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('EORI Number')}</span>
                    <span className="font-mono text-green-900">{product.manufacturerEORI}</span>
                  </div>
                )}
                {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('VAT ID')}</span>
                    <span className="font-mono text-green-900">{product.manufacturerVAT}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
