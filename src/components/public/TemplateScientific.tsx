import { useState } from 'react';
import { formatDate } from '@/lib/format';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';

import { RATING_DESCRIPTIONS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
import { SafeHtml } from '@/components/ui/safe-html';
import { PublicProductTicketDialog } from '@/components/public/PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
  tenantId: string | null;
}

export function TemplateScientific({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <ScientificCustomsView data={data} />;
  }

  return <ScientificConsumerView data={data} product={product} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
}

interface ConsumerViewProps extends ViewProps {
  product: Product;
  tenantId: string | null;
}

function ScientificConsumerView({ data, product, tenantId }: ConsumerViewProps) {
  const { isFieldVisible, consumerSections, t, locale, styles, design } = data;
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const ticketCreationEnabled = usePublicTicketCreationEnabled(tenantId);

  // Description is rendered outside the consumerSections loop and gets section number 1 if visible
  const hasDescription = isFieldVisible('description') && product.description;
  // Track section numbering: description takes slot 1 if present, then consumerSections continue
  let descriptionSectionNumber = 0;
  if (hasDescription) {
    descriptionSectionNumber = 1;
  }

  const renderSection = (section: RenderableSection, sectionNumber: number) => {
    switch (section.id) {
      case 'materials': return renderMaterials(sectionNumber);
      case 'packaging': return renderPackaging(sectionNumber);
      case 'carbonFootprint': return renderCarbonFootprint(sectionNumber);
      case 'recycling': return renderRecycling(sectionNumber);
      case 'certifications': return renderCertifications(sectionNumber);
      case 'supplyChain': return renderSupplyChain(sectionNumber);
      case 'support': return renderSupport(sectionNumber);
      case 'components': return product.productType === 'set' && product.components?.length ? (
        <DPPSetComponentsSection key="components" components={product.components} t={t} />
      ) : null;
      default: return null;
    }
  };

  const renderMaterials = (num: number) => (
    <section key="materials">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {num}. {t('Material Composition')}
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
            {getProductMaterials(product).map((material, index) => (
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
  );

  const renderPackaging = (num: number) => {
    const packagingMats = getPackagingMaterials(product);
    return (
      <section key="packaging">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {num}. {t('Packaging Materials')}
        </h2>
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2">
                <th className="py-2 text-left font-semibold">{t('Material')}</th>
                <th className="py-2 text-right font-semibold">{t('Share')}</th>
                <th className="py-2 text-center font-semibold">{t('Recyclable')}</th>
                {isFieldVisible('materialOrigins') && <th className="py-2 text-left font-semibold">{t('Origin')}</th>}
              </tr>
            </thead>
            <tbody>
              {packagingMats.map((m, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2 text-right font-mono">{m.percentage}%</td>
                  <td className="py-2 text-center">{m.recyclable ? '\u2713' : '\u2717'}</td>
                  {isFieldVisible('materialOrigins') && <td className="py-2">{m.origin || '\u2014'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <p className="mt-3 text-sm"><strong>{t('Packaging recyclable')}:</strong> {product.recyclability.packagingRecyclablePercentage}%</p>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <SafeHtml html={product.recyclability.packagingInstructions} className="mt-2 text-sm text-muted-foreground italic" />
        )}
      </section>
    );
  };

  const renderCarbonFootprint = (num: number) => (
    <section key="carbonFootprint">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {num}. {t('Carbon Footprint')}
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
              <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint!.totalKgCO2} kg</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3">{t('Production')} CO2</td>
              <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint!.productionKgCO2} kg</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3">{t('Transport')} CO2</td>
              <td className="py-2 px-3 text-right font-mono">{product.carbonFootprint!.transportKgCO2} kg</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3">{t('CO2 Rating')}</td>
              <td className="py-2 px-3 text-right font-bold">{product.carbonFootprint!.rating} &mdash; {t(RATING_DESCRIPTIONS[product.carbonFootprint!.rating])}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderRecycling = (num: number) => (
    <section key="recycling">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {num}. {t('Recycling & Disposal')}
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
                <td className="py-2 px-3"><SafeHtml html={product.recyclability.instructions} className="text-gray-700" /></td>
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
  );

  const renderCertifications = (num: number) => (
    <section key="certifications">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {num}. {t('Certifications')}
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
  );

  const renderSupplyChain = (num: number) => (
    <section key="supplyChain">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        {num}. {t('Supply Chain')}
      </h2>
      <p className="text-sm text-gray-600 mb-3">{t('The journey of your product from raw material to you')}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Step')}</th>
              <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Description')}</th>
              <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Location')}</th>
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
                {isFieldVisible('supplyChainEmissions') && (
                  <td className="py-2 px-3 text-right font-mono">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderSupport = (num: number) => {
    const sr = product.supportResources!;
    return (
      <section key="support">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {num}. {t('Support & Service')}
        </h2>
        <p className="text-sm text-gray-600 mb-3">{t('Customer support and product resources')}</p>
        <div className="space-y-6">
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Category')}</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.instructions && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Usage Instructions')}</td>
                      <td className="py-2 px-3"><SafeHtml html={sr.instructions} className="text-gray-700" /></td>
                    </tr>
                  )}
                  {sr.assemblyGuide && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Assembly Guide')}</td>
                      <td className="py-2 px-3"><SafeHtml html={sr.assemblyGuide} className="text-gray-700" /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Videos')}</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.videos.map((v, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{v.title}</td>
                      <td className="py-2 px-3"><a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{v.url}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('FAQ')}</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.faq.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{item.question}</td>
                      <td className="py-2 px-3"><SafeHtml html={item.answer} className="text-gray-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <tbody>
                  {sr.warranty.durationMonths != null && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Warranty Duration')}</td>
                      <td className="py-2 px-3 font-mono">{t('{{months}} months', { months: sr.warranty.durationMonths })}</td>
                    </tr>
                  )}
                  {sr.warranty.contactEmail && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Contact Email')}</td>
                      <td className="py-2 px-3">{sr.warranty.contactEmail}</td>
                    </tr>
                  )}
                  {sr.warranty.contactPhone && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Contact Phone')}</td>
                      <td className="py-2 px-3">{sr.warranty.contactPhone}</td>
                    </tr>
                  )}
                  {sr.warranty.terms && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Warranty Terms')}</td>
                      <td className="py-2 px-3"><SafeHtml html={sr.warranty.terms} className="text-gray-700" /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <tbody>
                  {sr.repairInfo.repairGuide && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Repair Guide')}</td>
                      <td className="py-2 px-3"><SafeHtml html={sr.repairInfo.repairGuide} className="text-gray-700" /></td>
                    </tr>
                  )}
                  {sr.repairInfo.repairabilityScore != null && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Repairability Score')}</td>
                      <td className="py-2 px-3 font-bold">{sr.repairInfo.repairabilityScore}/10</td>
                    </tr>
                  )}
                  {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Service Centers')}</td>
                      <td className="py-2 px-3 text-gray-700">{sr.repairInfo.serviceCenters.join('; ')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Spare Parts')}</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Part Number')}</th>
                    <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Value')}</th>
                    <th className="py-2 px-3 text-center font-semibold text-gray-700 border-b border-gray-200">{t('Available')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.spareParts.map((part, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{part.name}</td>
                      <td className="py-2 px-3 font-mono">{part.partNumber || '-'}</td>
                      <td className="py-2 px-3 text-right">{part.price != null ? `${part.price} ${part.currency || '\u20AC'}` : '-'}</td>
                      <td className="py-2 px-3 text-center">{part.available !== false ? t('Yes') : t('No')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contact Support Button */}
          {ticketCreationEnabled && (
            <div className="overflow-x-auto mt-6">
              <Button
                onClick={() => setTicketDialogOpen(true)}
                variant="outline"
                size="lg"
                className="w-full border-2"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('Contact Support', { ns: 'customer-portal' })}
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  };

  // Compute the total section count for the references footer
  const totalSections = (hasDescription ? 1 : 0) + consumerSections.length;

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
              <span className="text-gray-500">{t('Production Date')}:</span>
              <span>{formatDate(product.productionDate, locale)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Abstract / Description */}
      {hasDescription && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {descriptionSectionNumber}. {t('Description')}
          </h2>
          <SafeHtml html={product.description} className="text-gray-700 leading-relaxed max-w-none" />
        </section>
      )}

      {/* Consumer sections (dynamic order from DPP Design) */}
      {consumerSections.map((s, index) => {
        const sectionNumber = (hasDescription ? 1 : 0) + index + 1;
        return renderSection(s, sectionNumber);
      })}

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={styles.card}
        headingStyle={styles.heading}
        primaryColor={design.colors.secondaryColor}
        t={t}
      />

      {/* References / Footer */}
      <footer className="border-t-2 border-gray-300 pt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {totalSections + 1}. {t('References')}
        </h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>[1] {t('Digital Product Passport')} &mdash; GTIN: {product.gtin}</p>
          <p>[2] {t('Production Date')}: {formatDate(product.productionDate, locale)}</p>
          {product.manufacturer && (
            <p>[3] {t('Manufacturer Data')}: {product.manufacturer}</p>
          )}
        </div>
      </footer>

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

function ScientificCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, design } = data;

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
              {isFieldVisible('batchNumber') && product.batchNumber && (
                <>
                  <span className="text-gray-500">{t('Batch Number')}:</span>
                  <span className="font-mono">{product.batchNumber}</span>
                </>
              )}
              {isFieldVisible('hsCode') && product.hsCode && (
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
          <SafeHtml html={product.description} className="text-gray-700 leading-relaxed max-w-none" />
        </section>
      )}

      {/* Customs Data */}
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
                  <td className="py-2 px-3 text-right font-bold">{product.carbonFootprint.rating} &mdash; {t(RATING_DESCRIPTIONS[product.carbonFootprint.rating])}</td>
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
                    <td className="py-2 px-3"><SafeHtml html={product.recyclability.instructions} className="text-gray-700" /></td>
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
      {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {nextSection()}. {t('Full Supply Chain')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('The journey of your product from raw material to you')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Step')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Description')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Location')}</th>
                  <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Date')}</th>
                  {isFieldVisible('supplyChainTransport') && (
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
                    <td className="py-2 px-3">{formatDate(entry.date, locale)}</td>
                    {isFieldVisible('supplyChainTransport') && (
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

      {/* Support & Service */}
      {isFieldVisible('supportResources') && product.supportResources && (() => {
        const sr = product.supportResources!;
        const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
        if (!hasContent) return null;
        return (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {nextSection()}. {t('Support & Service')}
            </h2>
            <p className="text-sm text-gray-600 mb-3">{t('Customer support and product resources')}</p>
            <div className="space-y-6">
              {(sr.instructions || sr.assemblyGuide) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Category')}</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.instructions && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Usage Instructions')}</td>
                          <td className="py-2 px-3"><SafeHtml html={sr.instructions} className="text-gray-700" /></td>
                        </tr>
                      )}
                      {sr.assemblyGuide && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Assembly Guide')}</td>
                          <td className="py-2 px-3"><SafeHtml html={sr.assemblyGuide} className="text-gray-700" /></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Videos')}</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.videos.map((v, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                          <td className="py-2 px-3 font-medium">{v.title}</td>
                          <td className="py-2 px-3"><a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{v.url}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('FAQ')}</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Value')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.faq.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                          <td className="py-2 px-3 font-medium">{item.question}</td>
                          <td className="py-2 px-3"><SafeHtml html={item.answer} className="text-gray-600" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {isFieldVisible('supportWarranty') && sr.warranty && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <tbody>
                      {sr.warranty.durationMonths != null && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Warranty Duration')}</td>
                          <td className="py-2 px-3 font-mono">{t('{{months}} months', { months: sr.warranty.durationMonths })}</td>
                        </tr>
                      )}
                      {sr.warranty.contactEmail && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Contact Email')}</td>
                          <td className="py-2 px-3">{sr.warranty.contactEmail}</td>
                        </tr>
                      )}
                      {sr.warranty.contactPhone && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Contact Phone')}</td>
                          <td className="py-2 px-3">{sr.warranty.contactPhone}</td>
                        </tr>
                      )}
                      {sr.warranty.terms && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Warranty Terms')}</td>
                          <td className="py-2 px-3"><SafeHtml html={sr.warranty.terms} className="text-gray-700" /></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {isFieldVisible('supportRepair') && sr.repairInfo && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <tbody>
                      {sr.repairInfo.repairGuide && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold w-1/3">{t('Repair Guide')}</td>
                          <td className="py-2 px-3"><SafeHtml html={sr.repairInfo.repairGuide} className="text-gray-700" /></td>
                        </tr>
                      )}
                      {sr.repairInfo.repairabilityScore != null && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Repairability Score')}</td>
                          <td className="py-2 px-3 font-bold">{sr.repairInfo.repairabilityScore}/10</td>
                        </tr>
                      )}
                      {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 bg-gray-50 font-semibold">{t('Service Centers')}</td>
                          <td className="py-2 px-3 text-gray-700">{sr.repairInfo.serviceCenters.join('; ')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">#</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Spare Parts')}</th>
                        <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b border-gray-200">{t('Part Number')}</th>
                        <th className="py-2 px-3 text-right font-semibold text-gray-700 border-b border-gray-200">{t('Value')}</th>
                        <th className="py-2 px-3 text-center font-semibold text-gray-700 border-b border-gray-200">{t('Available')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.spareParts.map((part, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                          <td className="py-2 px-3 font-medium">{part.name}</td>
                          <td className="py-2 px-3 font-mono">{part.partNumber || '-'}</td>
                          <td className="py-2 px-3 text-right">{part.price != null ? `${part.price} ${part.currency || '\u20AC'}` : '-'}</td>
                          <td className="py-2 px-3 text-center">{part.available !== false ? t('Yes') : t('No')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
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
