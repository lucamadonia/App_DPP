import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  MapPin,
  HelpCircle,
  BookOpen,
  Video,
  MessageSquare,
  Wrench,
  Package,
} from 'lucide-react';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { RATING_TEXT_COLORS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { SafeHtml } from '@/components/ui/safe-html';
import { PublicProductTicketDialog } from './PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
  tenantId: string | null;
}

export function TemplatePremium({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <PremiumCustomsView data={data} tenantId={tenantId} />;
  }

  return <PremiumConsumerView data={data} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
  tenantId: string | null;
}

function PremiumConsumerView({ data, tenantId }: ViewProps) {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);
  const { product, isFieldVisible, t, locale, consumerSections, styles } = data;
  const cardStyle = styles.card;
  const headingStyle = styles.heading;

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

  const renderCarbonFootprint = () => {
    return (
      <div key="carbonFootprint" className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
        <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Carbon Footprint')}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`text-6xl font-bold ${RATING_TEXT_COLORS[product.carbonFootprint!.rating]}`}>
            {product.carbonFootprint!.rating}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-2xl font-semibold">{product.carbonFootprint!.totalKgCO2} {t('kg CO2')}</p>
            <div className="flex gap-6 mt-2 text-sm text-gray-400">
              <span>{t('Production')}: {product.carbonFootprint!.productionKgCO2} kg</span>
              <span>{t('Transport')}: {product.carbonFootprint!.transportKgCO2} kg</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMaterials = () => {
    return (
      <div key="materials" className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
        <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Material Composition')}</h2>
        <div className="space-y-4">
          {getProductMaterials(product).map((material, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white">{material.name}</span>
                  {material.recyclable && (
                    <span className="text-xs text-amber-400/70">({t('Recyclable')})</span>
                  )}
                </div>
                <span className="text-amber-400 font-semibold">{material.percentage}%</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400/80 to-amber-400 rounded-full"
                  style={{ width: `${material.percentage}%` }}
                />
              </div>
              {isFieldVisible('materialOrigins') && material.origin && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {material.origin}
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
        <h2 style={headingStyle} className="text-xl mb-1 flex items-center gap-2"><Package className="h-5 w-5" />{t('Packaging Materials')}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t('Packaging materials and recycling information')}</p>
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <div className="space-y-3">
            {packagingMats.map((material, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                <div>
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <span className="ml-2 text-xs text-green-400">&#9851; {t('Recyclable')}</span>
                  )}
                </div>
                <span className="font-semibold">{material.percentage}%</span>
              </div>
            ))}
          </div>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm">{t('Packaging recyclable')}</span>
            <span className="font-semibold">{product.recyclability.packagingRecyclablePercentage}%</span>
          </div>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <SafeHtml html={product.recyclability.packagingInstructions} className="mt-3 text-sm text-muted-foreground" />
        )}
      </div>
    );
  };

  const renderRecycling = () => {
    return (
      <div key="recycling" className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
        <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Recycling & Disposal')}</h2>
        <div className="flex items-center gap-6">
          <div className="text-4xl font-bold text-white">{product.recyclability.recyclablePercentage}%</div>
          <div className="flex-1">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${product.recyclability.recyclablePercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('Recyclable')}</p>
          </div>
        </div>
        {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
          <SafeHtml html={product.recyclability.instructions} className="mt-4 text-sm text-gray-400 border-t border-gray-800 pt-4" />
        )}
        {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {product.recyclability.disposalMethods.map((method, index) => (
              <span key={index} className="text-xs border border-amber-400/30 text-amber-400/80 px-3 py-1 rounded-full">
                {method}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCertifications = () => {
    return (
      <div key="certifications" className="bg-gradient-to-br from-amber-400/10 to-amber-400/5 border border-amber-400/30 rounded-lg p-6 sm:p-8">
        <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Certifications')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {product.certifications.map((cert, index) => (
            <div key={index} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{cert.name}</p>
                  <p className="text-sm text-gray-400">{cert.issuedBy}</p>
                  <p className="text-xs text-amber-400/60 mt-2">{t('Valid until')} {formatDate(cert.validUntil, locale)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSupplyChain = () => {
    return (
      <div key="supplyChain" className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
        <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {t('Supply Chain')}
        </h2>
        <div className="space-y-0">
          {product.supplyChain.map((entry, index) => {
            const isLast = index === product.supplyChain.length - 1;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-400 text-amber-400 flex items-center justify-center text-xs font-bold">
                    {entry.step}
                  </div>
                  {!isLast && <div className="w-px h-10 bg-amber-400/20" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-sm text-gray-500">{entry.location}, {entry.country}</p>
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
      <div key="support" className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
        <h2 className="text-amber-400 text-lg font-semibold mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <span className="flex items-center gap-2"><HelpCircle className="h-5 w-5" />{t('Support & Service')}</span>
        </h2>
        <p className="text-sm text-gray-500 mb-6">{t('Customer support and product resources')}</p>

        <div className="space-y-6">
          {/* Instructions & Assembly Guide */}
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="space-y-3">
              {sr.instructions && (
                <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-400" />
                    {t('Usage Instructions')}
                  </h4>
                  <SafeHtml html={sr.instructions} className="text-sm text-gray-400" />
                </div>
              )}
              {sr.assemblyGuide && (
                <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-400" />
                    {t('Assembly Guide')}
                  </h4>
                  <SafeHtml html={sr.assemblyGuide} className="text-sm text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* Videos */}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Video className="h-4 w-4 text-amber-400" />
                {t('Videos')}
              </h4>
              <div className="space-y-2">
                {sr.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-950/50 rounded-lg border border-amber-400/10 hover:border-amber-400/30 transition-colors text-sm font-medium text-amber-400">
                    <Video className="h-4 w-4 flex-shrink-0" />{v.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                {t('FAQ')}
              </h4>
              <div className="space-y-3">
                {sr.faq.map((item, i) => (
                  <div key={i} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                    <p className="text-sm font-semibold">{item.question}</p>
                    <SafeHtml html={item.answer} className="text-sm text-gray-400 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                {t('Warranty')}
              </h4>
              <div className="space-y-2">
                {sr.warranty.durationMonths != null && (
                  <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                    <span className="text-gray-500">{t('Warranty Duration')}</span>
                    <span>{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                  </div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                    <span className="text-gray-500">{t('Contact Email')}</span>
                    <span>{sr.warranty.contactEmail}</span>
                  </div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                    <span className="text-gray-500">{t('Contact Phone')}</span>
                    <span>{sr.warranty.contactPhone}</span>
                  </div>
                )}
              </div>
              {sr.warranty.terms && (
                <div className="mt-3 bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                  <p className="text-xs text-amber-400/60 mb-1">{t('Warranty Terms')}</p>
                  <SafeHtml html={sr.warranty.terms} className="text-sm text-gray-400" />
                </div>
              )}
            </div>
          )}

          {/* Repair Information */}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-400" />
                {t('Repair Information')}
              </h4>
              {sr.repairInfo.repairGuide && (
                <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10 mb-3">
                  <p className="text-xs text-amber-400/60 mb-1">{t('Repair Guide')}</p>
                  <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-gray-400" />
                </div>
              )}
              {sr.repairInfo.repairabilityScore != null && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm mb-2">
                  <span className="text-gray-500">{t('Repairability Score')}</span>
                  <span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span>
                </div>
              )}
              {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">{t('Service Centers')}</p>
                  {sr.repairInfo.serviceCenters.map((c, i) => (
                    <p key={i} className="text-sm text-gray-500 flex items-center gap-1 py-0.5">
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
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-400" />
                {t('Spare Parts')}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {sr.spareParts.map((part, i) => (
                  <div key={i} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{part.name}</p>
                      {part.partNumber && <p className="text-xs text-gray-500">{t('Part Number')}: {part.partNumber}</p>}
                    </div>
                    <div className="text-right">
                      {part.price != null && <p className="font-semibold text-sm text-amber-400">{part.price} {part.currency || '\u20AC'}</p>}
                      <p className={`text-xs ${part.available !== false ? 'text-green-400' : 'text-red-400'}`}>
                        {part.available !== false ? t('Available') : t('Out of stock')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticketCreationEnabled && (
            <div className="pt-6 border-t border-amber-400/20">
              <Button
                onClick={() => setTicketDialogOpen(true)}
                className="w-full bg-amber-400 hover:bg-amber-500 text-gray-950"
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative">
        {isFieldVisible('image') && product.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 to-gray-950" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
          {isFieldVisible('category') && (
            <p className="text-amber-400 text-sm uppercase tracking-[0.3em] mb-4">
              {product.category}
            </p>
          )}
          {isFieldVisible('name') && (
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {product.name}
            </h1>
          )}
          {isFieldVisible('manufacturer') && (
            <p className="text-gray-400 text-lg">{product.manufacturer}</p>
          )}
          {isFieldVisible('description') && product.description && (
            <SafeHtml html={product.description} className="mt-6 text-gray-300 max-w-2xl mx-auto leading-relaxed" />
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
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

function PremiumCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative">
        {isFieldVisible('image') && product.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 to-gray-950" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
          {isFieldVisible('category') && (
            <p className="text-amber-400 text-sm uppercase tracking-[0.3em] mb-4">
              {product.category}
            </p>
          )}
          {isFieldVisible('name') && (
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {product.name}
            </h1>
          )}
          {isFieldVisible('manufacturer') && (
            <p className="text-gray-400 text-lg">{product.manufacturer}</p>
          )}
          {isFieldVisible('description') && product.description && (
            <SafeHtml html={product.description} className="mt-6 text-gray-300 max-w-2xl mx-auto leading-relaxed" />
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
        {/* Customs identifiers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isFieldVisible('gtin') && (
            <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/70">GTIN</p>
              <p className="font-mono text-sm mt-1">{product.gtin}</p>
            </div>
          )}
          {isFieldVisible('serialNumber') && (
            <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/70">{t('Serial Number')}</p>
              <p className="font-mono text-sm mt-1">{product.serialNumber}</p>
            </div>
          )}
          {isFieldVisible('batchNumber') && product.batchNumber && (
            <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/70">{t('Batch Number')}</p>
              <p className="font-mono text-sm mt-1">{product.batchNumber}</p>
            </div>
          )}
          {isFieldVisible('hsCode') && product.hsCode && (
            <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/70">{t('HS Code')}</p>
              <p className="font-mono text-sm mt-1">{product.hsCode}</p>
            </div>
          )}
        </div>

        {/* Carbon Footprint */}
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
            <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Carbon Footprint')}</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className={`text-6xl font-bold ${RATING_TEXT_COLORS[product.carbonFootprint.rating]}`}>
                {product.carbonFootprint.rating}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-2xl font-semibold">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
                <div className="flex gap-6 mt-2 text-sm text-gray-400">
                  <span>{t('Production')}: {product.carbonFootprint.productionKgCO2} kg</span>
                  <span>{t('Transport')}: {product.carbonFootprint.transportKgCO2} kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Materials */}
        {isFieldVisible('materials') && product.materials.length > 0 && (
          <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
            <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Material Composition')}</h2>
            <div className="space-y-4">
              {product.materials.map((material, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{material.name}</span>
                      {material.recyclable && (
                        <span className="text-xs text-amber-400/70">({t('Recyclable')})</span>
                      )}
                    </div>
                    <span className="text-amber-400 font-semibold">{material.percentage}%</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400/80 to-amber-400 rounded-full"
                      style={{ width: `${material.percentage}%` }}
                    />
                  </div>
                  {isFieldVisible('materialOrigins') && material.origin && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {material.origin}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recyclability */}
        {isFieldVisible('recyclability') && (
          <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
            <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Recycling & Disposal')}</h2>
            <div className="flex items-center gap-6">
              <div className="text-4xl font-bold text-white">{product.recyclability.recyclablePercentage}%</div>
              <div className="flex-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${product.recyclability.recyclablePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('Recyclable')}</p>
              </div>
            </div>
            {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
              <SafeHtml html={product.recyclability.instructions} className="mt-4 text-sm text-gray-400 border-t border-gray-800 pt-4" />
            )}
            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {product.recyclability.disposalMethods.map((method, index) => (
                  <span key={index} className="text-xs border border-amber-400/30 text-amber-400/80 px-3 py-1 rounded-full">
                    {method}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certifications */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="bg-gradient-to-br from-amber-400/10 to-amber-400/5 border border-amber-400/30 rounded-lg p-6 sm:p-8">
            <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Certifications')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {product.certifications.map((cert, index) => (
                <div key={index} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-gray-400">{cert.issuedBy}</p>
                      <p className="text-xs text-amber-400/60 mt-2">{t('Valid until')} {formatDate(cert.validUntil, locale)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Supply Chain */}
        {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
          <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
            <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {t('Full Supply Chain')}
            </h2>
            <div className="space-y-0">
              {product.supplyChain.map((entry, index) => {
                const isLast = index === product.supplyChain.length - 1;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-amber-400 text-amber-400 flex items-center justify-center text-xs font-bold">
                        {entry.step}
                      </div>
                      {!isLast && <div className="w-px h-10 bg-amber-400/20" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-gray-500">{entry.location}, {entry.country}</p>
                      {entry.date && (
                        <p className="text-xs text-gray-600">{formatDate(entry.date, locale)}</p>
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
            <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
              <h2 className="text-amber-400 text-lg font-semibold mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                <span className="flex items-center gap-2"><HelpCircle className="h-5 w-5" />{t('Support & Service')}</span>
              </h2>
              <p className="text-sm text-gray-500 mb-6">{t('Customer support and product resources')}</p>

              <div className="space-y-6">
                {/* Instructions & Assembly Guide */}
                {(sr.instructions || sr.assemblyGuide) && (
                  <div className="space-y-3">
                    {sr.instructions && (
                      <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-400" />
                          {t('Usage Instructions')}
                        </h4>
                        <SafeHtml html={sr.instructions} className="text-sm text-gray-400" />
                      </div>
                    )}
                    {sr.assemblyGuide && (
                      <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-400" />
                          {t('Assembly Guide')}
                        </h4>
                        <SafeHtml html={sr.assemblyGuide} className="text-sm text-gray-400" />
                      </div>
                    )}
                  </div>
                )}

                {/* Videos */}
                {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4 text-amber-400" />
                      {t('Videos')}
                    </h4>
                    <div className="space-y-2">
                      {sr.videos.map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-950/50 rounded-lg border border-amber-400/10 hover:border-amber-400/30 transition-colors text-sm font-medium text-amber-400">
                          <Video className="h-4 w-4 flex-shrink-0" />{v.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-400" />
                      {t('FAQ')}
                    </h4>
                    <div className="space-y-3">
                      {sr.faq.map((item, i) => (
                        <div key={i} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                          <p className="text-sm font-semibold">{item.question}</p>
                          <SafeHtml html={item.answer} className="text-sm text-gray-400 mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warranty */}
                {isFieldVisible('supportWarranty') && sr.warranty && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      {t('Warranty')}
                    </h4>
                    <div className="space-y-2">
                      {sr.warranty.durationMonths != null && (
                        <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                          <span className="text-gray-500">{t('Warranty Duration')}</span>
                          <span>{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                        </div>
                      )}
                      {sr.warranty.contactEmail && (
                        <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                          <span className="text-gray-500">{t('Contact Email')}</span>
                          <span>{sr.warranty.contactEmail}</span>
                        </div>
                      )}
                      {sr.warranty.contactPhone && (
                        <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                          <span className="text-gray-500">{t('Contact Phone')}</span>
                          <span>{sr.warranty.contactPhone}</span>
                        </div>
                      )}
                    </div>
                    {sr.warranty.terms && (
                      <div className="mt-3 bg-gray-950/50 rounded-lg p-4 border border-amber-400/10">
                        <p className="text-xs text-amber-400/60 mb-1">{t('Warranty Terms')}</p>
                        <SafeHtml html={sr.warranty.terms} className="text-sm text-gray-400" />
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Information */}
                {isFieldVisible('supportRepair') && sr.repairInfo && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-400" />
                      {t('Repair Information')}
                    </h4>
                    {sr.repairInfo.repairGuide && (
                      <div className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10 mb-3">
                        <p className="text-xs text-amber-400/60 mb-1">{t('Repair Guide')}</p>
                        <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-gray-400" />
                      </div>
                    )}
                    {sr.repairInfo.repairabilityScore != null && (
                      <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm mb-2">
                        <span className="text-gray-500">{t('Repairability Score')}</span>
                        <span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span>
                      </div>
                    )}
                    {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">{t('Service Centers')}</p>
                        {sr.repairInfo.serviceCenters.map((c, i) => (
                          <p key={i} className="text-sm text-gray-500 flex items-center gap-1 py-0.5">
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
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-400" />
                      {t('Spare Parts')}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sr.spareParts.map((part, i) => (
                        <div key={i} className="bg-gray-950/50 rounded-lg p-4 border border-amber-400/10 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{part.name}</p>
                            {part.partNumber && <p className="text-xs text-gray-500">{t('Part Number')}: {part.partNumber}</p>}
                          </div>
                          <div className="text-right">
                            {part.price != null && <p className="font-semibold text-sm text-amber-400">{part.price} {part.currency || '\u20AC'}</p>}
                            <p className={`text-xs ${part.available !== false ? 'text-green-400' : 'text-red-400'}`}>
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

        {/* Customs Data */}
        <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-6 sm:p-8 backdrop-blur">
          <h2 className="text-amber-400 text-lg font-semibold mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{t('Customs Data')}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm text-amber-400/70 mb-3">{t('Product Data')}</h3>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('Country of Origin')}</span>
                  <span>{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('Net Weight')}</span>
                  <span>{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('Gross Weight')}</span>
                  <span>{product.grossWeight} g</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                <span className="text-gray-500">{t('Production Date')}</span>
                <span>{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm text-amber-400/70 mb-3">{t('Manufacturer Data')}</h3>
              <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                <span className="text-gray-500">{t('Company')}</span>
                <span>{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('Address')}</span>
                  <span className="text-right text-xs">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('EORI Number')}</span>
                  <span className="font-mono">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-1.5 border-b border-gray-800 text-sm">
                  <span className="text-gray-500">{t('VAT ID')}</span>
                  <span className="font-mono">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
