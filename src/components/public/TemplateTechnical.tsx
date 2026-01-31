import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  HelpCircle,
  BookOpen,
  Video,
  MessageSquare,
  Wrench,
  ShieldCheck,
  Package,
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

export function TemplateTechnical({ product, visibilityV2, view }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Dark Header Bar */}
      <div className="bg-gray-900 text-white p-4 sm:p-6 rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {isFieldVisible('image') && product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded border border-gray-700"
              />
            )}
            <div>
              {isFieldVisible('name') && (
                <h1 className="text-xl font-bold font-mono">{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-gray-400 text-sm font-mono">{product.manufacturer}</p>
              )}
            </div>
          </div>
          {isFieldVisible('category') && (
            <span className="font-mono text-xs bg-gray-800 px-3 py-1 rounded border border-gray-700 self-start sm:self-auto">
              {product.category}
            </span>
          )}
        </div>

        {/* Identifier grid in header */}
        {view === 'customs' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-700">
            {isFieldVisible('gtin') && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">GTIN</p>
                <p className="font-mono text-sm">{product.gtin}</p>
              </div>
            )}
            {isFieldVisible('serialNumber') && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('Serial Number')}</p>
                <p className="font-mono text-sm">{product.serialNumber}</p>
              </div>
            )}
            {isFieldVisible('batchNumber') && product.batchNumber && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('Batch Number')}</p>
                <p className="font-mono text-sm">{product.batchNumber}</p>
              </div>
            )}
            {isFieldVisible('hsCode') && product.hsCode && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('HS Code')}</p>
                <p className="font-mono text-sm">{product.hsCode}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white border border-gray-200 rounded-b-lg">
        {/* Description */}
        {isFieldVisible('description') && product.description && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t('Description')}</h2>
            <p className="text-sm text-gray-700">{product.description}</p>
          </div>
        )}

        {/* Customs Data Table */}
        {view === 'customs' && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('Customs Data')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <table className="w-full text-sm">
                <caption className="text-left text-xs font-semibold text-gray-600 mb-2">{t('Product Data')}</caption>
                <tbody className="divide-y divide-gray-100">
                  {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Country of Origin')}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{product.countryOfOrigin}</td>
                    </tr>
                  )}
                  {isFieldVisible('netWeight') && product.netWeight && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Net Weight')}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{product.netWeight} g</td>
                    </tr>
                  )}
                  {isFieldVisible('grossWeight') && product.grossWeight && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Gross Weight')}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{product.grossWeight} g</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Production Date')}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{formatDate(product.productionDate, locale)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full text-sm">
                <caption className="text-left text-xs font-semibold text-gray-600 mb-2">{t('Manufacturer Data')}</caption>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Company')}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{product.manufacturer}</td>
                  </tr>
                  {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Address')}</td>
                      <td className="py-1.5 text-right font-mono text-xs max-w-[180px] truncate">{product.manufacturerAddress}</td>
                    </tr>
                  )}
                  {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('EORI Number')}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{product.manufacturerEORI}</td>
                    </tr>
                  )}
                  {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono text-xs">{t('VAT ID')}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{product.manufacturerVAT}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Materials Table */}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('Material Composition')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Material')}</th>
                    <th className="py-2 text-right font-mono text-xs text-gray-600">{t('Share')}</th>
                    <th className="py-2 text-center font-mono text-xs text-gray-600">{t('Recyclable')}</th>
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Origin')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.materials.map((material, index) => (
                    <tr key={index}>
                      <td className="py-2 font-mono text-xs font-medium">{material.name}</td>
                      <td className="py-2 text-right font-mono text-xs">{material.percentage}%</td>
                      <td className="py-2 text-center font-mono text-xs">
                        {material.recyclable ? t('Yes') : t('No')}
                      </td>
                      <td className="py-2 font-mono text-xs text-gray-500">{material.origin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Carbon Footprint Grid */}
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('Carbon Footprint')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{t('CO2 Rating')}</p>
                <p className="text-2xl font-bold font-mono">{product.carbonFootprint.rating}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{t('Total')}</p>
                <p className="text-lg font-bold font-mono">{product.carbonFootprint.totalKgCO2} <span className="text-xs text-gray-500">kg</span></p>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{t('Production')}</p>
                <p className="text-lg font-bold font-mono">{product.carbonFootprint.productionKgCO2} <span className="text-xs text-gray-500">kg</span></p>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{t('Transport')}</p>
                <p className="text-lg font-bold font-mono">{product.carbonFootprint.transportKgCO2} <span className="text-xs text-gray-500">kg</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Recyclability */}
        {isFieldVisible('recyclability') && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('Recycling & Disposal')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{t('Recyclable')}</p>
                <p className="text-2xl font-bold font-mono">{product.recyclability.recyclablePercentage}%</p>
              </div>
              {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
                <div className="sm:col-span-2 bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">{t('Recycling Instructions')}</p>
                  <p className="text-xs text-gray-700 font-mono">{product.recyclability.instructions}</p>
                </div>
              )}
            </div>
            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">{t('Disposal Methods')}</p>
                <div className="flex flex-wrap gap-1">
                  {product.recyclability.disposalMethods.map((method, index) => (
                    <span key={index} className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Certifications Table */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{t('Certifications')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Certifications')}</th>
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Issued By')}</th>
                    <th className="py-2 text-right font-mono text-xs text-gray-600">{t('Valid until')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.certifications.map((cert, index) => (
                    <tr key={index}>
                      <td className="py-2 font-mono text-xs font-medium">{cert.name}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">{cert.issuedBy}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatDate(cert.validUntil, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Supply Chain Table */}
        {isFieldVisible(view === 'customs' ? 'supplyChainFull' : 'supplyChainSimple') && product.supplyChain.length > 0 && (
          <div className="p-4 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              {view === 'customs' ? t('Full Supply Chain') : t('Supply Chain')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Step')}</th>
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Description')}</th>
                    <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Location')}</th>
                    {view === 'customs' && (
                      <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Date')}</th>
                    )}
                    {view === 'customs' && isFieldVisible('supplyChainTransport') && (
                      <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Transport Mode')}</th>
                    )}
                    {isFieldVisible('supplyChainEmissions') && (
                      <th className="py-2 text-right font-mono text-xs text-gray-600">{t('Emissions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index}>
                      <td className="py-2 font-mono text-xs font-bold">{entry.step}</td>
                      <td className="py-2 font-mono text-xs">{entry.description}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">{entry.location}, {entry.country}</td>
                      {view === 'customs' && (
                        <td className="py-2 font-mono text-xs">{formatDate(entry.date, locale)}</td>
                      )}
                      {view === 'customs' && isFieldVisible('supplyChainTransport') && (
                        <td className="py-2 font-mono text-xs">{entry.transportMode ? t(entry.transportMode.charAt(0).toUpperCase() + entry.transportMode.slice(1)) : '-'}</td>
                      )}
                      {isFieldVisible('supplyChainEmissions') && (
                        <td className="py-2 text-right font-mono text-xs">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Support & Service */}
        {isFieldVisible('supportResources') && product.supportResources && (() => {
          const sr = product.supportResources!;
          const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
          if (!hasContent) return null;
          return (
            <div className="p-4 sm:p-6 border-t border-gray-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5" />
                {t('Support & Service')}
              </h2>
              <p className="text-[10px] text-gray-400 font-mono mb-4">{t('Customer support and product resources')}</p>

              <div className="space-y-4">
                {/* Instructions & Assembly Guide */}
                {(sr.instructions || sr.assemblyGuide) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sr.instructions && (
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-1">
                          <BookOpen className="h-3 w-3" />
                          {t('Usage Instructions')}
                        </p>
                        <p className="text-xs text-gray-700 font-mono">{sr.instructions}</p>
                      </div>
                    )}
                    {sr.assemblyGuide && (
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-1">
                          <BookOpen className="h-3 w-3" />
                          {t('Assembly Guide')}
                        </p>
                        <p className="text-xs text-gray-700 font-mono">{sr.assemblyGuide}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Videos */}
                {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <Video className="h-3 w-3" />
                      {t('Videos')}
                    </p>
                    <div className="space-y-1">
                      {sr.videos.map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline py-1">
                          <Video className="h-3 w-3 flex-shrink-0" />{v.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <MessageSquare className="h-3 w-3" />
                      {t('FAQ')}
                    </p>
                    <div className="divide-y divide-gray-100">
                      {sr.faq.map((item, i) => (
                        <div key={i} className="py-2">
                          <p className="font-mono text-xs font-bold text-gray-800">{item.question}</p>
                          <p className="font-mono text-xs text-gray-600 mt-0.5">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warranty */}
                {isFieldVisible('supportWarranty') && sr.warranty && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <ShieldCheck className="h-3 w-3" />
                      {t('Warranty')}
                    </p>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {sr.warranty.durationMonths != null && (
                          <tr>
                            <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Warranty Duration')}</td>
                            <td className="py-1.5 text-right font-mono text-xs">{t('{{months}} months', { months: sr.warranty.durationMonths })}</td>
                          </tr>
                        )}
                        {sr.warranty.contactEmail && (
                          <tr>
                            <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Contact Email')}</td>
                            <td className="py-1.5 text-right font-mono text-xs">{sr.warranty.contactEmail}</td>
                          </tr>
                        )}
                        {sr.warranty.contactPhone && (
                          <tr>
                            <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Contact Phone')}</td>
                            <td className="py-1.5 text-right font-mono text-xs">{sr.warranty.contactPhone}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {sr.warranty.terms && (
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">{t('Warranty Terms')}</p>
                        <p className="text-xs text-gray-700 font-mono">{sr.warranty.terms}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Information */}
                {isFieldVisible('supportRepair') && sr.repairInfo && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <Wrench className="h-3 w-3" />
                      {t('Repair Information')}
                    </p>
                    {sr.repairInfo.repairGuide && (
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">{t('Repair Guide')}</p>
                        <p className="text-xs text-gray-700 font-mono">{sr.repairInfo.repairGuide}</p>
                      </div>
                    )}
                    {sr.repairInfo.repairabilityScore != null && (
                      <table className="w-full text-sm mb-2">
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 text-gray-500 font-mono text-xs">{t('Repairability Score')}</td>
                            <td className="py-1.5 text-right font-mono text-xs font-bold">{sr.repairInfo.repairabilityScore}/10</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                    {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">{t('Service Centers')}</p>
                        {sr.repairInfo.serviceCenters.map((c, i) => (
                          <p key={i} className="font-mono text-xs text-gray-600 flex items-center gap-1 py-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />{c}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Spare Parts */}
                {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <Package className="h-3 w-3" />
                      {t('Spare Parts')}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Spare Parts')}</th>
                            <th className="py-2 text-left font-mono text-xs text-gray-600">{t('Part Number')}</th>
                            <th className="py-2 text-right font-mono text-xs text-gray-600">{t('Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sr.spareParts.map((part, i) => (
                            <tr key={i}>
                              <td className="py-2 font-mono text-xs font-medium">{part.name}</td>
                              <td className="py-2 font-mono text-xs text-gray-500">{part.partNumber || '-'}</td>
                              <td className="py-2 text-right font-mono text-xs">
                                {part.price != null && <span className="mr-2">{part.price} {part.currency || '€'}</span>}
                                <span className={part.available !== false ? 'text-green-600' : 'text-red-500'}>
                                  {part.available !== false ? t('Available') : t('Out of stock')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
