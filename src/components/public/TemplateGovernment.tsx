import { useState } from 'react';
import { formatDate } from '@/lib/format';
import { SafeHtml } from '@/components/ui/safe-html';
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
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
import { PublicProductTicketDialog } from '@/components/public/PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';
import { Button } from '@/components/ui/button';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
  tenantId: string | null;
}

export function TemplateGovernment({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <GovernmentCustomsView data={data} />;
  }

  return <GovernmentConsumerView data={data} product={product} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
}

interface ConsumerViewProps extends ViewProps {
  product: Product;
  tenantId: string | null;
}

function GovernmentConsumerView({ data, product, tenantId }: ConsumerViewProps) {
  const { isFieldVisible, t, locale, consumerSections, styles, design } = data;
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const ticketCreationEnabled = usePublicTicketCreationEnabled(tenantId);

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

  const renderMaterials = () => (
    <div key="materials" className="border-2 border-gray-800">
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
              {getProductMaterials(product).map((material, index) => (
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
  );

  const renderPackaging = () => {
    const packagingMats = getPackagingMaterials(product);
    return (
      <div key="packaging" className="border-2 border-gray-800">
        <div className="bg-gray-800 text-white px-6 py-3">
          <h2 className="font-bold uppercase tracking-wide text-sm flex items-center gap-2"><Package className="h-4 w-4" />{t('Packaging Materials')}</h2>
        </div>
        <div className="p-6">
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Material')}</th>
                <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Share')}</th>
                <th className="py-2 text-center font-bold text-xs uppercase tracking-wider text-gray-600">{t('Recyclable')}</th>
                {isFieldVisible('materialOrigins') && <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Origin')}</th>}
              </tr>
            </thead>
            <tbody>
              {packagingMats.map((m, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2 text-right">{m.percentage}%</td>
                  <td className="py-2 text-center">{m.recyclable ? t('Yes') : t('No')}</td>
                  {isFieldVisible('materialOrigins') && <td className="py-2">{m.origin || 'â€”'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
            <span>{t('Packaging recyclable')}</span>
            <span className="font-semibold">{product.recyclability.packagingRecyclablePercentage}%</span>
          </div>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <div className="mt-3 p-3 bg-muted/50 rounded">
            <p className="text-sm font-medium mb-1">{t('Packaging Recycling')}</p>
            <SafeHtml html={product.recyclability.packagingInstructions} className="text-sm text-muted-foreground" />
          </div>
        )}
        </div>
      </div>
    );
  };

  const renderCarbonFootprint = () => (
    <div key="carbonFootprint" className="border-2 border-gray-800">
      <div className="bg-gray-800 text-white px-6 py-3">
        <h2 className="font-bold uppercase tracking-wide text-sm">{t('Carbon Footprint')}</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border-2 border-gray-300 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-500">{t('CO2 Rating')}</p>
            <p className="text-3xl font-bold mt-1">{product.carbonFootprint!.rating}</p>
          </div>
          <div className="border-2 border-gray-300 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-500">{t('Total')}</p>
            <p className="text-xl font-bold mt-1">{product.carbonFootprint!.totalKgCO2} kg</p>
          </div>
          <div className="border-2 border-gray-300 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-500">{t('Production')}</p>
            <p className="text-xl font-bold mt-1">{product.carbonFootprint!.productionKgCO2} kg</p>
          </div>
          <div className="border-2 border-gray-300 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-500">{t('Transport')}</p>
            <p className="text-xl font-bold mt-1">{product.carbonFootprint!.transportKgCO2} kg</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecycling = () => (
    <div key="recycling" className="border-2 border-gray-800">
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
            <SafeHtml html={product.recyclability.instructions} className="text-sm text-gray-700" />
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
  );

  const renderCertifications = () => (
    <div key="certifications" className="border-2 border-gray-800">
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
  );

  const renderSupplyChain = () => (
    <div key="supplyChain" className="border-2 border-gray-800">
      <div className="bg-gray-800 text-white px-6 py-3">
        <h2 className="font-bold uppercase tracking-wide text-sm">{t('Supply Chain')}</h2>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Step')}</th>
                <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Description')}</th>
                <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Location')}</th>
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
  );

  const renderSupport = () => {
    const sr = product.supportResources!;
    return (
      <div key="support" className="border-2 border-gray-800">
        <div className="bg-gray-800 text-white px-6 py-3">
          <h2 className="font-bold uppercase tracking-wide text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {t('Support & Service')}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-xs text-gray-500 -mt-2">{t('Customer support and product resources')}</p>

          {/* Instructions & Assembly Guide */}
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="space-y-4">
              {sr.instructions && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t('Usage Instructions')}
                  </h4>
                  <SafeHtml html={sr.instructions} className="text-sm text-gray-700" />
                </div>
              )}
              {sr.assemblyGuide && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {t('Assembly Guide')}
                  </h4>
                  <SafeHtml html={sr.assemblyGuide} className="text-sm text-gray-700" />
                </div>
              )}
            </div>
          )}

          {/* Videos */}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div className="border-2 border-gray-300 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                {t('Videos')}
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {sr.videos.map((v, i) => (
                  <li key={i}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium">
                      {v.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAQ */}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div className="border-2 border-gray-300 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {t('FAQ')}
              </h4>
              <div className="space-y-3">
                {sr.faq.map((item, i) => (
                  <div key={i} className="border-b border-gray-200 pb-2">
                    <p className="font-medium text-sm">{item.question}</p>
                    <SafeHtml html={item.answer} className="text-sm text-gray-600 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div className="border-2 border-gray-300 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('Warranty')}
              </h4>
              <div className="space-y-0">
                {sr.warranty.durationMonths != null && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Warranty Duration')}:</span>
                    <span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                  </div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Contact Email')}:</span>
                    <span className="font-medium">{sr.warranty.contactEmail}</span>
                  </div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                    <span className="text-gray-600">{t('Contact Phone')}:</span>
                    <span className="font-medium">{sr.warranty.contactPhone}</span>
                  </div>
                )}
              </div>
              {sr.warranty.terms && (
                <div className="mt-3 border-2 border-gray-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{t('Warranty Terms')}</p>
                  <SafeHtml html={sr.warranty.terms} className="text-sm text-gray-700" />
                </div>
              )}
            </div>
          )}

          {/* Repair Information */}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div className="border-2 border-gray-300 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />
                {t('Repair Information')}
              </h4>
              {sr.repairInfo.repairGuide && (
                <div className="border-2 border-gray-200 p-3 mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{t('Repair Guide')}</p>
                  <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-gray-700" />
                </div>
              )}
              {sr.repairInfo.repairabilityScore != null && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm mb-2">
                  <span className="text-gray-600">{t('Repairability Score')}:</span>
                  <span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span>
                </div>
              )}
              {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t('Service Centers')}</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {sr.repairInfo.serviceCenters.map((c, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Spare Parts */}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div className="border-2 border-gray-300 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {t('Spare Parts')}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-400">
                      <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Spare Parts')}</th>
                      <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Part Number')}</th>
                      <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sr.spareParts.map((part, i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-2 font-medium">{part.name}</td>
                        <td className="py-2 font-mono text-gray-600">{part.partNumber || '-'}</td>
                        <td className="py-2 text-right">
                          {part.price != null && <span className="mr-2 font-medium">{part.price} {part.currency || '\u20AC'}</span>}
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

          {/* Contact Support Button */}
          {ticketCreationEnabled && (
            <div className="border-t-2 border-gray-300 pt-4">
              <Button
                onClick={() => setTicketDialogOpen(true)}
                variant="outline"
                size="lg"
                className="w-full border-2 border-gray-400 hover:bg-gray-100 font-semibold"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('Contact Support', { ns: 'customer-portal' })}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
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
            <SafeHtml html={product.description} className="text-sm text-gray-700" />
          </div>
        )}
      </div>

      {consumerSections.map(s => renderSection(s))}

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={styles.card}
        headingStyle={styles.heading}
        primaryColor={design.colors.secondaryColor}
        t={t}
      />

      {/* Document footer stamp */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-300">
        {t('Digital Product Passport')} &mdash; {product.gtin}
      </div>

      {/* Ticket Dialog */}
      {ticketCreationEnabled && tenantId && (
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

function GovernmentCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, design } = data;

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
              {isFieldVisible('batchNumber') && product.batchNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('Batch Number')}:</span>
                  <span className="font-mono font-bold">{product.batchNumber}</span>
                </div>
              )}
              {isFieldVisible('hsCode') && product.hsCode && (
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
            <SafeHtml html={product.description} className="text-sm text-gray-700" />
          </div>
        )}
      </div>

      {/* Customs Data Section */}
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
                <SafeHtml html={product.recyclability.instructions} className="text-sm text-gray-700" />
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

      {/* Full Supply Chain Section */}
      {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
        <div className="border-2 border-gray-800">
          <div className="bg-gray-800 text-white px-6 py-3">
            <h2 className="font-bold uppercase tracking-wide text-sm">{t('Full Supply Chain')}</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Step')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Description')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Location')}</th>
                    <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Date')}</th>
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
                      <td className="py-2 font-mono">{formatDate(entry.date, locale)}</td>
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

      {/* Support & Service Section */}
      {isFieldVisible('supportResources') && product.supportResources && (() => {
        const sr = product.supportResources!;
        const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
        if (!hasContent) return null;
        return (
          <div className="border-2 border-gray-800">
            <div className="bg-gray-800 text-white px-6 py-3">
              <h2 className="font-bold uppercase tracking-wide text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {t('Support & Service')}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-xs text-gray-500 -mt-2">{t('Customer support and product resources')}</p>

              {(sr.instructions || sr.assemblyGuide) && (
                <div className="space-y-4">
                  {sr.instructions && (
                    <div className="border-2 border-gray-300 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {t('Usage Instructions')}
                      </h4>
                      <SafeHtml html={sr.instructions} className="text-sm text-gray-700" />
                    </div>
                  )}
                  {sr.assemblyGuide && (
                    <div className="border-2 border-gray-300 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {t('Assembly Guide')}
                      </h4>
                      <SafeHtml html={sr.assemblyGuide} className="text-sm text-gray-700" />
                    </div>
                  )}
                </div>
              )}

              {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    {t('Videos')}
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {sr.videos.map((v, i) => (
                      <li key={i}>
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium">
                          {v.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t('FAQ')}
                  </h4>
                  <div className="space-y-3">
                    {sr.faq.map((item, i) => (
                      <div key={i} className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-sm">{item.question}</p>
                        <SafeHtml html={item.answer} className="text-sm text-gray-600 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isFieldVisible('supportWarranty') && sr.warranty && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('Warranty')}
                  </h4>
                  <div className="space-y-0">
                    {sr.warranty.durationMonths != null && (
                      <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                        <span className="text-gray-600">{t('Warranty Duration')}:</span>
                        <span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
                      </div>
                    )}
                    {sr.warranty.contactEmail && (
                      <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                        <span className="text-gray-600">{t('Contact Email')}:</span>
                        <span className="font-medium">{sr.warranty.contactEmail}</span>
                      </div>
                    )}
                    {sr.warranty.contactPhone && (
                      <div className="flex justify-between py-2 border-b border-gray-200 text-sm">
                        <span className="text-gray-600">{t('Contact Phone')}:</span>
                        <span className="font-medium">{sr.warranty.contactPhone}</span>
                      </div>
                    )}
                  </div>
                  {sr.warranty.terms && (
                    <div className="mt-3 border-2 border-gray-200 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{t('Warranty Terms')}</p>
                      <SafeHtml html={sr.warranty.terms} className="text-sm text-gray-700" />
                    </div>
                  )}
                </div>
              )}

              {isFieldVisible('supportRepair') && sr.repairInfo && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" />
                    {t('Repair Information')}
                  </h4>
                  {sr.repairInfo.repairGuide && (
                    <div className="border-2 border-gray-200 p-3 mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{t('Repair Guide')}</p>
                      <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-gray-700" />
                    </div>
                  )}
                  {sr.repairInfo.repairabilityScore != null && (
                    <div className="flex justify-between py-2 border-b border-gray-200 text-sm mb-2">
                      <span className="text-gray-600">{t('Repairability Score')}:</span>
                      <span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span>
                    </div>
                  )}
                  {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t('Service Centers')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {sr.repairInfo.serviceCenters.map((c, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                <div className="border-2 border-gray-300 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {t('Spare Parts')}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-400">
                          <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Spare Parts')}</th>
                          <th className="py-2 text-left font-bold text-xs uppercase tracking-wider text-gray-600">{t('Part Number')}</th>
                          <th className="py-2 text-right font-bold text-xs uppercase tracking-wider text-gray-600">{t('Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sr.spareParts.map((part, i) => (
                          <tr key={i} className="border-b border-gray-200">
                            <td className="py-2 font-medium">{part.name}</td>
                            <td className="py-2 font-mono text-gray-600">{part.partNumber || '-'}</td>
                            <td className="py-2 text-right">
                              {part.price != null && <span className="mr-2 font-medium">{part.price} {part.currency || '\u20AC'}</span>}
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

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={styles.card}
        headingStyle={styles.heading}
        primaryColor={design.colors.secondaryColor}
        t={t}
      />

      {/* Document footer stamp */}
      <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-300">
        {t('Digital Product Passport')} &mdash; {product.gtin}
      </div>
    </div>
  );
}
