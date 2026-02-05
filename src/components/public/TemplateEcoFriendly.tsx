import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { SafeHtml } from '@/components/ui/safe-html';
import { Button } from '@/components/ui/button';
import {
  Leaf,
  Recycle,
  MapPin,
  HelpCircle,
  BookOpen,
  Video,
  MessageSquare,
  Wrench,
  ShieldCheck,
  Package,
} from 'lucide-react';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { RATING_ECO_COLORS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { PublicProductTicketDialog } from './PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
  tenantId: string | null;
}

export function TemplateEcoFriendly({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <EcoFriendlyCustomsView data={data} tenantId={tenantId} />;
  }

  return <EcoFriendlyConsumerView data={data} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
  tenantId: string | null;
}

function EcoFriendlyConsumerView({ data, tenantId }: ViewProps) {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);
  const { product, isFieldVisible, t, locale, consumerSections, styles } = data;
  const cardStyle = styles.card;
  const headingStyle = styles.heading;

  const renderSection = (section: RenderableSection) => {
    switch (section.id) {
      case 'carbonFootprint': return renderCarbonFootprint();
      case 'recycling': return renderRecycling();
      case 'materials': return renderMaterials();
      case 'packaging': return renderPackaging();
      case 'certifications': return renderCertifications();
      case 'supplyChain': return renderSupplyChain();
      case 'support': return renderSupport();
      case 'components': return product.productType === 'set' && product.components?.length ? (
        <DPPSetComponentsSection key="components" components={product.components} cardStyle={styles.card} headingStyle={styles.heading} t={t} />
      ) : null;
      default: return null;
    }
  };

  const renderCarbonFootprint = () => {
    return (
      <div key="carbonFootprint" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-bold text-green-800">{t('Carbon Footprint')}</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full ${RATING_ECO_COLORS[product.carbonFootprint!.rating]} text-white flex items-center justify-center text-4xl font-bold shadow-lg`}>
            {product.carbonFootprint!.rating}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-3xl font-bold text-green-800">{product.carbonFootprint!.totalKgCO2} {t('kg CO2')}</p>
            <div className="flex gap-6 mt-2 justify-center sm:justify-start text-sm text-green-700">
              <span>{t('Production')}: {product.carbonFootprint!.productionKgCO2} kg</span>
              <span>{t('Transport')}: {product.carbonFootprint!.transportKgCO2} kg</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecycling = () => {
    return (
      <div key="recycling" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
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
                <SafeHtml html={product.recyclability.instructions} className="text-sm text-green-800" />
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
    );
  };

  const renderMaterials = () => {
    return (
      <div key="materials" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
        <h2 className="text-xl font-bold text-green-800 mb-6">{t('Material Composition')}</h2>
        <div className="space-y-4">
          {getProductMaterials(product).map((material, index) => (
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
    );
  };

  const renderPackaging = () => {
    const packagingMats = getPackagingMaterials(product);
    return (
      <div key="packaging" className="p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-5 w-5 text-green-600" />
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Packaging Materials')}</h2>
            <p className="text-sm text-muted-foreground">{t('Packaging materials and recycling information')}</p>
          </div>
        </div>
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <div className="space-y-3">
            {packagingMats.map((material, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><Recycle className="h-3 w-3" />{t('Recyclable')}</span>
                  )}
                </div>
                <span className="font-semibold text-green-700 dark:text-green-400">{material.percentage}%</span>
              </div>
            ))}
          </div>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <div className="mt-4 p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">{t('Packaging recyclable')}</span>
            <span className="font-bold text-green-700 dark:text-green-400">{product.recyclability.packagingRecyclablePercentage}%</span>
          </div>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">{t('Packaging Recycling')}</p>
            <SafeHtml html={product.recyclability.packagingInstructions} className="text-sm text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  const renderCertifications = () => {
    return (
      <div key="certifications" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
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
    );
  };

  const renderSupplyChain = () => {
    return (
      <div key="supplyChain" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
        <h2 className="text-xl font-bold text-green-800 mb-6">{t('Supply Chain')}</h2>
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
    );
  };

  const renderSupport = () => {
    const sr = product.supportResources!;
    return (
      <div key="support" className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-bold text-green-800">{t('Support & Service')}</h2>
        </div>
        <p className="text-sm text-green-600 mb-6">{t('Customer support and product resources')}</p>

        <div className="space-y-6">
          {/* Instructions & Assembly Guide */}
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="space-y-3">
              {sr.instructions && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    {t('Usage Instructions')}
                  </h4>
                  <SafeHtml html={sr.instructions} className="text-sm text-green-800" />
                </div>
              )}
              {sr.assemblyGuide && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    {t('Assembly Guide')}
                  </h4>
                  <SafeHtml html={sr.assemblyGuide} className="text-sm text-green-800" />
                </div>
              )}
            </div>
          )}

          {/* Videos */}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div>
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Video className="h-4 w-4 text-green-600" />
                {t('Videos')}
              </h4>
              <div className="space-y-2">
                {sr.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium text-green-700">
                    <Video className="h-4 w-4 flex-shrink-0" />{v.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div>
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                {t('FAQ')}
              </h4>
              <div className="space-y-3">
                {sr.faq.map((item, i) => (
                  <div key={i} className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="font-medium text-sm text-green-900">{item.question}</p>
                    <SafeHtml html={item.answer} className="text-sm text-green-700 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div>
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                {t('Warranty')}
              </h4>
              <div className="space-y-2">
                {sr.warranty.durationMonths != null && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Warranty Duration')}</span>
                    <span className="font-medium text-green-900">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                  </div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Contact Email')}</span>
                    <span className="font-medium text-green-900">{sr.warranty.contactEmail}</span>
                  </div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                    <span className="text-green-600">{t('Contact Phone')}</span>
                    <span className="font-medium text-green-900">{sr.warranty.contactPhone}</span>
                  </div>
                )}
              </div>
              {sr.warranty.terms && (
                <div className="bg-green-50 p-4 rounded-xl mt-3">
                  <p className="text-xs text-green-600 mb-1">{t('Warranty Terms')}</p>
                  <SafeHtml html={sr.warranty.terms} className="text-sm text-green-800" />
                </div>
              )}
            </div>
          )}

          {/* Repair Information */}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div>
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-green-600" />
                {t('Repair Information')}
              </h4>
              {sr.repairInfo.repairGuide && (
                <div className="bg-green-50 p-4 rounded-xl mb-3">
                  <p className="text-xs text-green-600 mb-1">{t('Repair Guide')}</p>
                  <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-green-800" />
                </div>
              )}
              {sr.repairInfo.repairabilityScore != null && (
                <div className="flex justify-between py-1.5 border-b border-green-100 text-sm mb-2">
                  <span className="text-green-600">{t('Repairability Score')}</span>
                  <span className="font-bold text-green-900">{sr.repairInfo.repairabilityScore}/10</span>
                </div>
              )}
              {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">{t('Service Centers')}</p>
                  {sr.repairInfo.serviceCenters.map((c, i) => (
                    <p key={i} className="text-sm text-green-600 flex items-center gap-1 py-0.5">
                      <MapPin className="h-3 w-3" />{c}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spare Parts */}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div>
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                {t('Spare Parts')}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {sr.spareParts.map((part, i) => (
                  <div key={i} className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-900 text-sm">{part.name}</p>
                      {part.partNumber && <p className="text-xs text-green-600">{t('Part Number')}: {part.partNumber}</p>}
                    </div>
                    <div className="text-right">
                      {part.price != null && <p className="font-medium text-sm text-green-900">{part.price} {part.currency || '\u20ac'}</p>}
                      <p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>
                        {part.available !== false ? t('Available') : t('Out of stock')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticketCreationEnabled && (
            <div className="pt-6 border-t border-green-200">
              <Button
                onClick={() => setTicketDialogOpen(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('Contact Support')}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
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
                <SafeHtml html={product.description} className="text-green-100 leading-relaxed" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {consumerSections.map(s => renderSection(s))}
      </div>

      {tenantId && (
        <PublicProductTicketDialog
          open={ticketDialogOpen}
          onOpenChange={setTicketDialogOpen}
          tenantId={tenantId}
          productName={product.name}
          gtin={product.gtin}
          serialNumber={product.serialNumber}
        />
      )}
    </div>
  );
}

function EcoFriendlyCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale } = data;

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
                <SafeHtml html={product.description} className="text-green-100 leading-relaxed" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Customs Data */}
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

        {/* Full Supply Chain */}
        {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
            <h2 className="text-xl font-bold text-green-800 mb-6">{t('Full Supply Chain')}</h2>
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
                      {entry.date && (
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

        {/* Support & Service */}
        {isFieldVisible('supportResources') && product.supportResources && (() => {
          const sr = product.supportResources!;
          const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
          if (!hasContent) return null;
          return (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-bold text-green-800">{t('Support & Service')}</h2>
              </div>
              <p className="text-sm text-green-600 mb-6">{t('Customer support and product resources')}</p>

              <div className="space-y-6">
                {/* Instructions & Assembly Guide */}
                {(sr.instructions || sr.assemblyGuide) && (
                  <div className="space-y-3">
                    {sr.instructions && (
                      <div className="bg-green-50 p-4 rounded-xl">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-green-600" />
                          {t('Usage Instructions')}
                        </h4>
                        <SafeHtml html={sr.instructions} className="text-sm text-green-800" />
                      </div>
                    )}
                    {sr.assemblyGuide && (
                      <div className="bg-green-50 p-4 rounded-xl">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-green-600" />
                          {t('Assembly Guide')}
                        </h4>
                        <SafeHtml html={sr.assemblyGuide} className="text-sm text-green-800" />
                      </div>
                    )}
                  </div>
                )}

                {/* Videos */}
                {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4 text-green-600" />
                      {t('Videos')}
                    </h4>
                    <div className="space-y-2">
                      {sr.videos.map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium text-green-700">
                          <Video className="h-4 w-4 flex-shrink-0" />{v.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      {t('FAQ')}
                    </h4>
                    <div className="space-y-3">
                      {sr.faq.map((item, i) => (
                        <div key={i} className="bg-green-50 p-4 rounded-xl border border-green-100">
                          <p className="font-medium text-sm text-green-900">{item.question}</p>
                          <SafeHtml html={item.answer} className="text-sm text-green-700 mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warranty */}
                {isFieldVisible('supportWarranty') && sr.warranty && (
                  <div>
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      {t('Warranty')}
                    </h4>
                    <div className="space-y-2">
                      {sr.warranty.durationMonths != null && (
                        <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                          <span className="text-green-600">{t('Warranty Duration')}</span>
                          <span className="font-medium text-green-900">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                        </div>
                      )}
                      {sr.warranty.contactEmail && (
                        <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                          <span className="text-green-600">{t('Contact Email')}</span>
                          <span className="font-medium text-green-900">{sr.warranty.contactEmail}</span>
                        </div>
                      )}
                      {sr.warranty.contactPhone && (
                        <div className="flex justify-between py-1.5 border-b border-green-100 text-sm">
                          <span className="text-green-600">{t('Contact Phone')}</span>
                          <span className="font-medium text-green-900">{sr.warranty.contactPhone}</span>
                        </div>
                      )}
                    </div>
                    {sr.warranty.terms && (
                      <div className="bg-green-50 p-4 rounded-xl mt-3">
                        <p className="text-xs text-green-600 mb-1">{t('Warranty Terms')}</p>
                        <SafeHtml html={sr.warranty.terms} className="text-sm text-green-800" />
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Information */}
                {isFieldVisible('supportRepair') && sr.repairInfo && (
                  <div>
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-green-600" />
                      {t('Repair Information')}
                    </h4>
                    {sr.repairInfo.repairGuide && (
                      <div className="bg-green-50 p-4 rounded-xl mb-3">
                        <p className="text-xs text-green-600 mb-1">{t('Repair Guide')}</p>
                        <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-green-800" />
                      </div>
                    )}
                    {sr.repairInfo.repairabilityScore != null && (
                      <div className="flex justify-between py-1.5 border-b border-green-100 text-sm mb-2">
                        <span className="text-green-600">{t('Repairability Score')}</span>
                        <span className="font-bold text-green-900">{sr.repairInfo.repairabilityScore}/10</span>
                      </div>
                    )}
                    {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-900 mb-1">{t('Service Centers')}</p>
                        {sr.repairInfo.serviceCenters.map((c, i) => (
                          <p key={i} className="text-sm text-green-600 flex items-center gap-1 py-0.5">
                            <MapPin className="h-3 w-3" />{c}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Spare Parts */}
                {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-600" />
                      {t('Spare Parts')}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sr.spareParts.map((part, i) => (
                        <div key={i} className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900 text-sm">{part.name}</p>
                            {part.partNumber && <p className="text-xs text-green-600">{t('Part Number')}: {part.partNumber}</p>}
                          </div>
                          <div className="text-right">
                            {part.price != null && <p className="font-medium text-sm text-green-900">{part.price} {part.currency || '\u20ac'}</p>}
                            <p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>
                              {part.available !== false ? t('Available') : t('Out of stock')}
                            </p>
                          </div>
                        </div>
                      ))}
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
