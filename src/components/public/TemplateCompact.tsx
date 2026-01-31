import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings, DPPSectionId } from '@/types/database';
import { resolveDesign, getCardStyle, getHeadingStyle, isSectionVisible } from '@/lib/dpp-design-utils';

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

export function TemplateCompact({ product, visibilityV2, view, dppDesign }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();
  const design = resolveDesign(dppDesign);

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  if (view === 'customs') {
    return <CompactCustomsView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} design={design} />;
  }

  return <CompactConsumerView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} design={design} />;
}

interface ViewProps {
  product: Product;
  isFieldVisible: (field: string) => boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
  design: ReturnType<typeof resolveDesign>;
}

type ConsumerTab = 'materials' | 'co2' | 'recycling' | 'certs' | 'supply' | 'support';
type CustomsTab = 'customs' | 'materials' | 'certs' | 'supply' | 'co2';

// Mapping from DPPSectionId to ConsumerTab id
const sectionToTabMap: Record<DPPSectionId, ConsumerTab> = {
  materials: 'materials',
  carbonFootprint: 'co2',
  recycling: 'recycling',
  certifications: 'certs',
  supplyChain: 'supply',
  support: 'support',
};

function CompactConsumerView({ product, isFieldVisible, t, locale, design }: ViewProps) {
  const cardStyle = getCardStyle(design.cards);
  const headingStyle = getHeadingStyle(design.typography, design.colors);

  // Build all tabs with their config
  const allTabs: Record<ConsumerTab, { label: string; icon: React.ReactNode; visible: boolean }> = {
    materials: { label: t('Material'), icon: <Package className="h-3.5 w-3.5" />, visible: isFieldVisible('materials') && product.materials.length > 0 },
    co2: { label: 'CO2', icon: <Leaf className="h-3.5 w-3.5" />, visible: isFieldVisible('carbonFootprint') && !!product.carbonFootprint },
    recycling: { label: t('Recycling'), icon: <Recycle className="h-3.5 w-3.5" />, visible: isFieldVisible('recyclability') },
    certs: { label: t('Certifications'), icon: <Award className="h-3.5 w-3.5" />, visible: isFieldVisible('certifications') && product.certifications.length > 0 },
    supply: { label: t('Supply Chain'), icon: <Truck className="h-3.5 w-3.5" />, visible: isFieldVisible('supplyChainSimple') && product.supplyChain.length > 0 },
    support: { label: t('Support & Service'), icon: <HelpCircle className="h-3.5 w-3.5" />, visible: isFieldVisible('supportResources') && !!product.supportResources && !!(product.supportResources.instructions || product.supportResources.assemblyGuide || (product.supportResources.videos && product.supportResources.videos.length > 0) || (product.supportResources.faq && product.supportResources.faq.length > 0) || product.supportResources.warranty || product.supportResources.repairInfo || (product.supportResources.spareParts && product.supportResources.spareParts.length > 0)) },
  };

  // Order tabs according to design.sections.order, filtering by section visibility and data visibility
  const orderedTabIds: ConsumerTab[] = design.sections.order
    .filter((sectionId: DPPSectionId) => isSectionVisible(design, sectionId))
    .map((sectionId: DPPSectionId) => sectionToTabMap[sectionId])
    .filter((tabId: ConsumerTab) => allTabs[tabId]?.visible);

  const visibleTabs = orderedTabIds.map((id) => ({ id, ...allTabs[id] }));

  const [activeTab, setActiveTab] = useState<ConsumerTab>(visibleTabs[0]?.id ?? 'materials');

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
          <span className={`${ratingColors[product.carbonFootprint.rating]} text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
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
            {product.materials.map((material, index) => (
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

        {activeTab === 'co2' && isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-2xl font-bold">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
                <p className="text-sm text-muted-foreground">{t('Total')}</p>
              </div>
              <div className={`w-14 h-14 rounded-full ${ratingColors[product.carbonFootprint.rating]} text-white flex items-center justify-center text-2xl font-bold`}>
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
                <p className="text-sm text-muted-foreground">{product.recyclability.instructions}</p>
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

        {activeTab === 'certs' && isFieldVisible('certifications') && (
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

        {activeTab === 'supply' && isFieldVisible('supplyChainSimple') && (
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
                      {entry.emissionsKg} kg CO₂
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
                      <p className="text-sm text-muted-foreground">{sr.instructions}</p>
                    </div>
                  )}
                  {sr.assemblyGuide && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" />{t('Assembly Guide')}</p>
                      <p className="text-sm text-muted-foreground">{sr.assemblyGuide}</p>
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
                      <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
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
                      <div className="text-right">{part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || '€'}</p>}<p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function CompactCustomsView({ product, isFieldVisible, t, locale, design }: ViewProps) {
  const [activeTab, setActiveTab] = useState<CustomsTab>('customs');
  const cardStyle = getCardStyle(design.cards);
  const headingStyle = getHeadingStyle(design.typography, design.colors);

  const tabs: { id: CustomsTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'customs', label: t('Customs Data'), icon: <ShieldCheck className="h-3.5 w-3.5" />, visible: true },
    { id: 'materials', label: t('Material'), icon: <Package className="h-3.5 w-3.5" />, visible: isFieldVisible('materials') && product.materials.length > 0 },
    { id: 'certs', label: t('Certifications'), icon: <Award className="h-3.5 w-3.5" />, visible: isFieldVisible('certifications') && product.certifications.length > 0 },
    { id: 'supply', label: t('Supply Chain'), icon: <Truck className="h-3.5 w-3.5" />, visible: isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 },
    { id: 'co2', label: 'CO2', icon: <Leaf className="h-3.5 w-3.5" />, visible: isFieldVisible('carbonFootprint') && !!product.carbonFootprint },
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
                      {entry.emissionsKg} kg CO₂
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
      </div>
    </div>
  );
}
