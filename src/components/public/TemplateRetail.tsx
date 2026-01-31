import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  MapPin,
  ShieldCheck,
  Star,
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
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

const ratingStars: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

export function TemplateRetail({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Large product image */}
      {isFieldVisible('image') && product.imageUrl && (
        <div className="rounded-3xl overflow-hidden shadow-lg">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 sm:h-80 object-cover"
          />
        </div>
      )}

      {/* Product info header */}
      <div className="text-center space-y-3 px-4">
        {isFieldVisible('name') && (
          <h1 className="text-3xl font-bold">{product.name}</h1>
        )}
        {isFieldVisible('manufacturer') && (
          <p className="text-muted-foreground">{product.manufacturer}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {isFieldVisible('category') && (
            <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-medium">
              {product.category}
            </span>
          )}
          {isFieldVisible('carbonRating') && product.carbonFootprint && (
            <span className={`${ratingColors[product.carbonFootprint.rating]} text-white px-4 py-1 rounded-full text-sm font-medium`}>
              {t('CO2 Rating')}: {product.carbonFootprint.rating}
            </span>
          )}
        </div>
      </div>

      {/* Key features badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <Leaf className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-green-700">{product.carbonFootprint.rating}</p>
            <p className="text-xs text-green-600">{t('CO2 Rating')}</p>
          </div>
        )}
        {isFieldVisible('recyclability') && (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <Recycle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-emerald-700">{product.recyclability.recyclablePercentage}%</p>
            <p className="text-xs text-emerald-600">{t('Recyclable')}</p>
          </div>
        )}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <Award className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-blue-700">{product.certifications.length}</p>
            <p className="text-xs text-blue-600">{t('Certifications')}</p>
          </div>
        )}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="bg-purple-50 rounded-2xl p-4 text-center">
            <Package className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-purple-700">{product.materials.length}</p>
            <p className="text-xs text-purple-600">{t('Material')}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {isFieldVisible('description') && product.description && (
        <div className="bg-gray-50 rounded-2xl p-6">
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Eco Score with stars */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">{t('Carbon Footprint')}</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-6 w-6 ${i < ratingStars[product.carbonFootprint!.rating] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-2xl font-bold text-green-700">{product.carbonFootprint.rating}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-700">{product.carbonFootprint.totalKgCO2}</p>
              <p className="text-xs text-green-600">{t('kg CO2 Total')}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-700">{product.carbonFootprint.productionKgCO2}</p>
              <p className="text-xs text-green-600">{t('kg CO2 Production')}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-700">{product.carbonFootprint.transportKgCO2}</p>
              <p className="text-xs text-green-600">{t('kg CO2 Transport')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold">{t('Material Composition')}</h2>
          </div>
          <div className="space-y-3">
            {product.materials.map((material, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{material.name}</span>
                      {material.recyclable && (
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {t('Recyclable')}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold">{material.percentage}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                      style={{ width: `${material.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recyclability */}
      {isFieldVisible('recyclability') && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Recycle className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold">{t('Recycling & Disposal')}</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${product.recyclability.recyclablePercentage * 2.64} 264`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-600">{product.recyclability.recyclablePercentage}%</span>
              </div>
            </div>
            <div className="flex-1">
              {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
                <p className="text-sm text-gray-600">{product.recyclability.instructions}</p>
              )}
            </div>
          </div>
          {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.recyclability.disposalMethods.map((method, index) => (
                <span key={index} className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">
                  {method}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certifications with colored badges */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold">{t('Certifications')}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {product.certifications.map((cert, index) => (
              <div key={index} className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{cert.name}</p>
                  <p className="text-sm text-gray-600">{cert.issuedBy}</p>
                  <p className="text-xs text-blue-600 mt-1">{t('Valid until')} {formatDate(cert.validUntil, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supply Chain */}
      {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">
              {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
            </h2>
          </div>
          <div className="space-y-0">
            {product.supplyChain.map((entry, index) => {
              const isLast = index === product.supplyChain.length - 1;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                      {entry.step}
                    </div>
                    {!isLast && <div className="w-0.5 h-8 bg-orange-200" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {entry.location}, {entry.country}
                    </p>
                    {view === 'customs' && entry.date && (
                      <p className="text-xs text-gray-400">{formatDate(entry.date, locale)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customs data */}
      {view === 'customs' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-bold">{t('Customs Data')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{t('Product Data')}</h3>
              {isFieldVisible('gtin') && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">GTIN</span>
                  <span className="font-mono">{product.gtin}</span>
                </div>
              )}
              {isFieldVisible('serialNumber') && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Serial Number')}</span>
                  <span className="font-mono">{product.serialNumber}</span>
                </div>
              )}
              {isFieldVisible('batchNumber') && product.batchNumber && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Batch Number')}</span>
                  <span className="font-mono">{product.batchNumber}</span>
                </div>
              )}
              {isFieldVisible('hsCode') && product.hsCode && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('HS Code')}</span>
                  <span className="font-mono">{product.hsCode}</span>
                </div>
              )}
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Country of Origin')}</span>
                  <span>{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Net Weight')}</span>
                  <span>{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Gross Weight')}</span>
                  <span>{product.grossWeight} g</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{t('Manufacturer Data')}</h3>
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span className="text-gray-500">{t('Company')}</span>
                <span>{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('Address')}</span>
                  <span className="text-right text-xs">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('EORI Number')}</span>
                  <span className="font-mono">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-1.5 border-b text-sm">
                  <span className="text-gray-500">{t('VAT ID')}</span>
                  <span className="font-mono">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
