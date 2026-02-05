import { useState } from 'react';
import { formatDate } from '@/lib/format';
import {
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  Download,
  MapPin,
  Info,
  Building2,
  ShieldCheck,
  Globe,
  HelpCircle,
  BookOpen,
  Video,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings, DPPSectionId } from '@/types/database';
import { useDPPTemplateData } from '@/hooks/use-dpp-template-data';

import { RATING_BG_COLORS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
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

export function TemplateCompact({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <CompactCustomsView data={data} tenantId={tenantId} />;
  }

  return <CompactConsumerView data={data} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
  tenantId: string | null;
}

// Tab config per DPPSectionId for consumer view
const SECTION_TAB_CONFIG: Record<DPPSectionId, { label: string; icon: React.ReactNode }> = {
  materials: { label: 'Material', icon: <Package className="h-3.5 w-3.5" /> },
  packaging: { label: 'Packaging', icon: <Package className="h-3.5 w-3.5" /> },
  carbonFootprint: { label: 'CO2', icon: <Leaf className="h-3.5 w-3.5" /> },
  recycling: { label: 'Recycling', icon: <Recycle className="h-3.5 w-3.5" /> },
  certifications: { label: 'Certifications', icon: <Award className="h-3.5 w-3.5" /> },
  supplyChain: { label: 'Supply Chain', icon: <Truck className="h-3.5 w-3.5" /> },
  support: { label: 'Support & Service', icon: <HelpCircle className="h-3.5 w-3.5" /> },
  components: { label: 'Components', icon: <Package className="h-3.5 w-3.5" /> },
};

type CustomsTab = 'customs' | 'materials' | 'certs' | 'supply' | 'co2' | 'support';

function CompactConsumerView({ data, tenantId }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, consumerSections, design } = data;
  const { card: cardStyle, heading: headingStyle } = styles;
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);

  // Build visible tabs from consumerSections (already ordered, filtered by visibility + data)
  const visibleTabs = consumerSections.map((section) => {
    const config = SECTION_TAB_CONFIG[section.id];
    return { id: section.id, label: t(config.label), icon: config.icon };
  });

  const [activeTab, setActiveTab] = useState<DPPSectionId>(visibleTabs[0]?.id ?? 'materials');

  return (
    <div className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
      {/* Slim Banner */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        {isFieldVisible('image') && product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          {isFieldVisible('name') && (
            <h1 className="text-lg font-bold truncate" style={headingStyle}>{product.name}</h1>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isFieldVisible('manufacturer') && (
              <span className="truncate">{product.manufacturer}</span>
            )}
            {isFieldVisible('category') && (
              <Badge variant="outline" className="text-xs flex-shrink-0">{product.category}</Badge>
            )}
          </div>
        </div>
        {isFieldVisible('carbonRating') && product.carbonFootprint && (
          <span className={`${RATING_BG_COLORS[product.carbonFootprint.rating]} text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
            {product.carbonFootprint.rating}
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'materials' && isFieldVisible('materials') && (
          <div className="space-y-3" style={cardStyle}>
            {getProductMaterials(product).map((material, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{material.name}</span>
                  {material.recyclable && (
                    <Recycle className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isFieldVisible('materialOrigins') && material.origin && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {material.origin}
                    </span>
                  )}
                  <span className="font-bold text-sm w-12 text-right">{material.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'packaging' && (() => {
          const packagingMats = getPackagingMaterials(product);
          return (
            <div key="packaging" className="p-4" style={cardStyle}>
              <h3 style={headingStyle} className="text-lg mb-3 flex items-center gap-2"><Package className="h-4 w-4" />{t('Packaging Materials')}</h3>
              {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
                <div className="space-y-2">
                  {packagingMats.map((material, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{material.name}</span>
                        {material.recyclable && <Recycle className="h-3 w-3 text-green-500" />}
                      </div>
                      <span className="font-medium">{material.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
              {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
                <p className="text-sm mt-3">{t('Packaging recyclable')}: <span className="font-medium">{product.recyclability.packagingRecyclablePercentage}%</span></p>
              )}
              {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
                <SafeHtml html={product.recyclability.packagingInstructions} className="text-sm text-muted-foreground mt-2" />
              )}
            </div>
          );
        })()}

        {activeTab === 'carbonFootprint' && isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-2xl font-bold">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
                <p className="text-sm text-muted-foreground">{t('Total')}</p>
              </div>
              <div className={`w-14 h-14 rounded-full ${RATING_BG_COLORS[product.carbonFootprint.rating]} text-white flex items-center justify-center text-2xl font-bold`}>
                {product.carbonFootprint.rating}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xl font-bold">{product.carbonFootprint.productionKgCO2} kg</p>
                <p className="text-xs text-muted-foreground">{t('Production')}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xl font-bold">{product.carbonFootprint.transportKgCO2} kg</p>
                <p className="text-xs text-muted-foreground">{t('Transport')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recycling' && isFieldVisible('recyclability') && (
          <div className="space-y-4" style={cardStyle}>
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {product.recyclability.recyclablePercentage}%
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${product.recyclability.recyclablePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('Recyclable')}</p>
              </div>
            </div>

            {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-1">
                  <Info className="h-3.5 w-3.5" />
                  {t('Recycling Instructions')}
                </p>
                <SafeHtml html={product.recyclability.instructions} className="text-sm text-muted-foreground" />
              </div>
            )}

            {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.recyclability.disposalMethods.map((method, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{method}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'certifications' && isFieldVisible('certifications') && (
          <div className="space-y-2" style={cardStyle}>
            {product.certifications.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">{cert.issuedBy}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(cert.validUntil, locale)}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'supplyChain' && isFieldVisible('supplyChainSimple') && (
          <div className="space-y-2" style={cardStyle}>
            {product.supplyChain.map((entry, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {entry.step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.description}</p>
                  {isFieldVisible('supplyChainProcessType') && entry.processType && (
                    <p className="text-xs text-primary font-medium">{t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {entry.location}, {entry.country}
                  </p>
                  {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Leaf className="h-3 w-3" />
                      {entry.emissionsKg} kg COâ‚‚
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'support' && isFieldVisible('supportResources') && product.supportResources && (() => {
          const sr = product.supportResources!;
          return (
            <div className="space-y-3" style={cardStyle}>
              {(sr.instructions || sr.assemblyGuide) && (
                <div className="space-y-2">
                  {sr.instructions && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" />{t('Usage Instructions')}</p>
                      <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />
                    </div>
                  )}
                  {sr.assemblyGuide && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" />{t('Assembly Guide')}</p>
                      <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                <div className="space-y-1.5">
                  {sr.videos.map((v, i) => (
                    <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm font-medium text-primary hover:bg-muted/50 transition-colors">
                      <Video className="h-3.5 w-3.5 flex-shrink-0" />{v.title}
                    </a>
                  ))}
                </div>
              )}
              {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                <div className="space-y-2">
                  {sr.faq.map((item, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-sm">{item.question}</p>
                      <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
                    </div>
                  ))}
                </div>
              )}
              {isFieldVisible('supportWarranty') && sr.warranty && (
                <div className="space-y-1">
                  {sr.warranty.durationMonths != null && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Warranty Duration')}</span><span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span></div>
                  )}
                  {sr.warranty.contactEmail && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Contact Email')}</span><span className="font-medium">{sr.warranty.contactEmail}</span></div>
                  )}
                  {sr.warranty.contactPhone && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Contact Phone')}</span><span className="font-medium">{sr.warranty.contactPhone}</span></div>
                  )}
                </div>
              )}
              {isFieldVisible('supportRepair') && sr.repairInfo && (
                <div className="space-y-2">
                  {sr.repairInfo.repairabilityScore != null && (
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg text-sm"><span>{t('Repairability Score')}</span><span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span></div>
                  )}
                  {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                    <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t('Service Centers')}</p>{sr.repairInfo.serviceCenters.map((c, i) => <p key={i} className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>)}</div>
                  )}
                </div>
              )}
              {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                <div className="space-y-1.5">
                  {sr.spareParts.map((part, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div><p className="font-medium text-sm">{part.name}</p>{part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}</div>
                      <div className="text-right">{part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || 'â‚¬'}</p>}<p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p></div>
                    </div>
                  ))}
                </div>
              )}

              {ticketCreationEnabled && (
                <div className="pt-2 border-t">
                  <Button
                    onClick={() => setTicketDialogOpen(true)}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-2" />
                    {t('Contact Support')}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'components' && product.productType === 'set' && product.components?.length && (
          <DPPSetComponentsSection components={product.components} cardStyle={cardStyle} headingStyle={headingStyle} t={t} />
        )}
      </div>

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={styles.card}
        headingStyle={styles.heading}
        primaryColor={design.colors.secondaryColor}
        t={t}
      />

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

function CompactCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, supportHasContent, design } = data;
  const { card: cardStyle, heading: headingStyle } = styles;
  const [activeTab, setActiveTab] = useState<CustomsTab>('customs');

  const tabs: { id: CustomsTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'customs', label: t('Customs Data'), icon: <ShieldCheck className="h-3.5 w-3.5" />, visible: true },
    { id: 'materials', label: t('Material'), icon: <Package className="h-3.5 w-3.5" />, visible: isFieldVisible('materials') && product.materials.length > 0 },
    { id: 'certs', label: t('Certifications'), icon: <Award className="h-3.5 w-3.5" />, visible: isFieldVisible('certifications') && product.certifications.length > 0 },
    { id: 'supply', label: t('Supply Chain'), icon: <Truck className="h-3.5 w-3.5" />, visible: isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 },
    { id: 'co2', label: 'CO2', icon: <Leaf className="h-3.5 w-3.5" />, visible: isFieldVisible('carbonFootprint') && !!product.carbonFootprint },
    { id: 'support', label: t('Support & Service'), icon: <HelpCircle className="h-3.5 w-3.5" />, visible: isFieldVisible('supportResources') && supportHasContent },
  ];

  const visibleTabs = tabs.filter(t => t.visible);

  return (
    <div className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
      {/* Slim Banner with Identifiers */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        {isFieldVisible('image') && product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          {isFieldVisible('name') && (
            <h1 className="text-lg font-bold truncate" style={headingStyle}>{product.name}</h1>
          )}
          {isFieldVisible('manufacturer') && (
            <p className="text-sm text-muted-foreground truncate">{product.manufacturer}</p>
          )}
        </div>
      </div>

      {/* Identifier Row */}
      <div className="flex flex-wrap gap-2">
        {isFieldVisible('gtin') && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono">
            <span className="text-muted-foreground">GTIN</span> {product.gtin}
          </span>
        )}
        {isFieldVisible('serialNumber') && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono">
            <span className="text-muted-foreground">SN</span> {product.serialNumber}
          </span>
        )}
        {isFieldVisible('batchNumber') && product.batchNumber && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono">
            <span className="text-muted-foreground">Batch</span> {product.batchNumber}
          </span>
        )}
        {isFieldVisible('hsCode') && product.hsCode && (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono">
            <span className="text-muted-foreground">HS</span> {product.hsCode}
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'customs' && (
          <div className="space-y-4" style={cardStyle}>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2" style={headingStyle}>
                <Globe className="h-3.5 w-3.5" />
                {t('Product Data')}
              </h4>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('Country of Origin')}</span>
                  <span className="font-medium">{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('Net Weight')}</span>
                  <span className="font-medium">{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('Gross Weight')}</span>
                  <span className="font-medium">{product.grossWeight} g</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b text-sm">
                <span className="text-muted-foreground">{t('Production Date')}</span>
                <span className="font-medium">{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2" style={headingStyle}>
                <Building2 className="h-3.5 w-3.5" />
                {t('Manufacturer Data')}
              </h4>
              <div className="flex justify-between py-2 border-b text-sm">
                <span className="text-muted-foreground">{t('Company')}</span>
                <span className="font-medium">{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('Address')}</span>
                  <span className="font-medium text-right text-xs">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('EORI Number')}</span>
                  <span className="font-mono font-medium text-xs">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">{t('VAT ID')}</span>
                  <span className="font-mono font-medium text-xs">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'materials' && isFieldVisible('materials') && (
          <div className="space-y-2" style={cardStyle}>
            {product.materials.map((material, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">{t('Yes')}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{material.origin || '-'}</span>
                  <span className="font-bold w-10 text-right">{material.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'certs' && isFieldVisible('certifications') && (
          <div className="space-y-2" style={cardStyle}>
            {product.certifications.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cert.issuedBy} | {formatDate(cert.validUntil, locale)}
                    </p>
                  </div>
                </div>
                {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'supply' && isFieldVisible('supplyChainFull') && (
          <div className="space-y-2" style={cardStyle}>
            {product.supplyChain.map((entry, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                <Badge variant="outline" className="font-mono text-xs flex-shrink-0">{entry.step}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.description}</p>
                  {isFieldVisible('supplyChainProcessType') && entry.processType && (
                    <p className="text-xs text-primary font-medium">{t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {entry.location}, {entry.country} | {formatDate(entry.date, locale)}
                    {isFieldVisible('supplyChainTransport') && entry.transportMode && ` | ${t(entry.transportMode.charAt(0).toUpperCase() + entry.transportMode.slice(1))}`}
                  </p>
                  {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Leaf className="h-3 w-3" />
                      {entry.emissionsKg} kg COâ‚‚
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'co2' && isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="space-y-3" style={cardStyle}>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-[10px] text-muted-foreground">{t('kg CO2 Total')}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-[10px] text-muted-foreground">{t('kg CO2 Production')}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xl font-bold">{product.carbonFootprint.transportKgCO2}</p>
                <p className="text-[10px] text-muted-foreground">{t('kg CO2 Transport')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && isFieldVisible('supportResources') && product.supportResources && (() => {
          const sr = product.supportResources!;
          return (
            <div className="space-y-3" style={cardStyle}>
              {(sr.instructions || sr.assemblyGuide) && (
                <div className="space-y-2">
                  {sr.instructions && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" />{t('Usage Instructions')}</p>
                      <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />
                    </div>
                  )}
                  {sr.assemblyGuide && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" />{t('Assembly Guide')}</p>
                      <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                <div className="space-y-1.5">
                  {sr.videos.map((v, i) => (
                    <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm font-medium text-primary hover:bg-muted/50 transition-colors">
                      <Video className="h-3.5 w-3.5 flex-shrink-0" />{v.title}
                    </a>
                  ))}
                </div>
              )}
              {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                <div className="space-y-2">
                  {sr.faq.map((item, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-medium text-sm">{item.question}</p>
                      <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
                    </div>
                  ))}
                </div>
              )}
              {isFieldVisible('supportWarranty') && sr.warranty && (
                <div className="space-y-1">
                  {sr.warranty.durationMonths != null && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Warranty Duration')}</span><span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span></div>
                  )}
                  {sr.warranty.contactEmail && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Contact Email')}</span><span className="font-medium">{sr.warranty.contactEmail}</span></div>
                  )}
                  {sr.warranty.contactPhone && (
                    <div className="flex justify-between py-2 border-b text-sm"><span className="text-muted-foreground">{t('Contact Phone')}</span><span className="font-medium">{sr.warranty.contactPhone}</span></div>
                  )}
                </div>
              )}
              {isFieldVisible('supportRepair') && sr.repairInfo && (
                <div className="space-y-2">
                  {sr.repairInfo.repairabilityScore != null && (
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg text-sm"><span>{t('Repairability Score')}</span><span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span></div>
                  )}
                  {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                    <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t('Service Centers')}</p>{sr.repairInfo.serviceCenters.map((c, i) => <p key={i} className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>)}</div>
                  )}
                </div>
              )}
              {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                <div className="space-y-1.5">
                  {sr.spareParts.map((part, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div><p className="font-medium text-sm">{part.name}</p>{part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}</div>
                      <div className="text-right">{part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || 'â‚¬'}</p>}<p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={styles.card}
        headingStyle={styles.heading}
        primaryColor={design.colors.secondaryColor}
        t={t}
      />
    </div>
  );
}
