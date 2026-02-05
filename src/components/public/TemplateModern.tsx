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
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SafeHtml } from '@/components/ui/safe-html';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';
import { RATING_GRADIENT_COLORS, RATING_BG_COLORS, RATING_DESCRIPTIONS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
import { usePublicBranding } from '@/pages/public/PublicLayout';
import { PublicProductTicketDialog } from './PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';

interface DPPTemplateProps {
  product: Product;
  tenantId: string | null;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
}

export function TemplateModern({ product, tenantId, visibilityV2, view, dppDesign }: DPPTemplateProps) {
  const { branding } = usePublicBranding();
  const primaryColor = branding?.primaryColor || '#3B82F6';
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign, primaryColor);

  if (view === 'customs') {
    return <ModernCustomsView data={data} primaryColor={primaryColor} tenantId={tenantId} />;
  }

  return <ModernConsumerView data={data} primaryColor={primaryColor} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
  primaryColor: string;
  tenantId: string | null;
}

function ModernConsumerView({ data, primaryColor, tenantId }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, consumerSections, design } = data;
  const { card: cardStyle, heading: headingStyle, hero: heroResult } = styles;
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);

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
        <DPPSetComponentsSection key="components" components={product.components} cardStyle={cardStyle} headingStyle={headingStyle} t={t} />
      ) : null;
      default: return null;
    }
  };

  const renderSupport = () => {
    const sr = product.supportResources!;
    return (
      <div key="support" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Support & Service')}</h2>
            <p className="text-sm text-muted-foreground">{t('Customer support and product resources')}</p>
          </div>
        </div>
        <div className="space-y-6">
          {(sr.instructions || sr.assemblyGuide) && (
            <div className="space-y-3">
              {sr.instructions && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" />{t('Usage Instructions')}</h4>
                  <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />
                </div>
              )}
              {sr.assemblyGuide && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" />{t('Assembly Guide')}</h4>
                  <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Video className="h-4 w-4" />{t('Videos')}</h4>
              <div className="space-y-2">
                {sr.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl ring-1 ring-black/5 hover:ring-primary/30 transition-all text-sm font-medium" style={{ color: primaryColor }}>
                    <Video className="h-4 w-4 flex-shrink-0" />
                    {v.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" />{t('FAQ')}</h4>
              <div className="space-y-3">
                {sr.faq.map((item, i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-xl">
                    <p className="font-medium text-sm">{item.question}</p>
                    <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {isFieldVisible('supportWarranty') && sr.warranty && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />{t('Warranty')}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {sr.warranty.durationMonths != null && (
                  <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Warranty Duration')}</p><p className="font-medium text-sm">{t('{{months}} months', { months: sr.warranty.durationMonths })}</p></div>
                )}
                {sr.warranty.contactEmail && (
                  <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Contact Email')}</p><p className="font-medium text-sm">{sr.warranty.contactEmail}</p></div>
                )}
                {sr.warranty.contactPhone && (
                  <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Contact Phone')}</p><p className="font-medium text-sm">{sr.warranty.contactPhone}</p></div>
                )}
                {sr.warranty.terms && (
                  <div className="p-3 bg-muted/50 rounded-xl sm:col-span-2"><p className="text-xs text-muted-foreground">{t('Warranty Terms')}</p><SafeHtml html={sr.warranty.terms} className="text-sm mt-1" /></div>
                )}
              </div>
            </div>
          )}
          {isFieldVisible('supportRepair') && sr.repairInfo && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Wrench className="h-4 w-4" />{t('Repair Information')}</h4>
              <div className="space-y-2">
                {sr.repairInfo.repairGuide && (
                  <div className="p-4 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground mb-1">{t('Repair Guide')}</p><SafeHtml html={sr.repairInfo.repairGuide} className="text-sm" /></div>
                )}
                {sr.repairInfo.repairabilityScore != null && (
                  <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between"><span className="text-sm">{t('Repairability Score')}</span><span className="font-bold text-lg" style={{ color: primaryColor }}>{sr.repairInfo.repairabilityScore}/10</span></div>
                )}
                {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground mb-2">{t('Service Centers')}</p>{sr.repairInfo.serviceCenters.map((c, i) => <p key={i} className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>)}</div>
                )}
              </div>
            </div>
          )}
          {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Package className="h-4 w-4" />{t('Spare Parts')}</h4>
              <div className="space-y-2">
                {sr.spareParts.map((part, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl ring-1 ring-black/5">
                    <div>
                      <p className="font-medium text-sm">{part.name}</p>
                      {part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}
                    </div>
                    <div className="text-right">
                      {part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || '\u20AC'}</p>}
                      <p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ticketCreationEnabled && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => setTicketDialogOpen(true)}
                className="w-full"
                variant="outline"
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

  const renderMaterials = () => {
    return (
      <div key="materials" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Material Composition')}</h2>
            <p className="text-sm text-muted-foreground">{t('Materials used and their origins')}</p>
          </div>
        </div>
        <div className="space-y-5">
          {getProductMaterials(product).map((material, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800">
                      <Recycle className="h-3 w-3" />
                      {t('Recyclable')}
                    </span>
                  )}
                </div>
                <span className="font-bold" style={{ color: primaryColor }}>{material.percentage}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${material.percentage}%`, background: `linear-gradient(to right, ${primaryColor}b3, ${primaryColor})` }}
                />
              </div>
              {isFieldVisible('materialOrigins') && material.origin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
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
      <div key="packaging" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Packaging Materials')}</h2>
            <p className="text-sm text-muted-foreground">{t('Packaging materials and recycling information')}</p>
          </div>
        </div>
        <div className="space-y-5">
          {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && packagingMats.map((material, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{material.name}</span>
                  {material.recyclable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800">
                      <Recycle className="h-3 w-3" />
                      {t('Recyclable')}
                    </span>
                  )}
                </div>
                <span className="font-bold" style={{ color: primaryColor }}>{material.percentage}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${material.percentage}%`, background: `linear-gradient(to right, ${primaryColor}b3, ${primaryColor})` }}
                />
              </div>
              {isFieldVisible('materialOrigins') && material.origin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {t('Origin')}: {material.origin}
                </p>
              )}
            </div>
          ))}
          {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('Packaging recyclable')}</span>
                <span className="font-bold" style={{ color: primaryColor }}>{product.recyclability.packagingRecyclablePercentage}%</span>
              </div>
            </div>
          )}
          {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
            <div className="p-4 bg-muted/50 rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                {t('Packaging Recycling')}
              </h4>
              <SafeHtml html={product.recyclability.packagingInstructions} className="text-sm text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCarbonFootprint = () => {
    return (
      <div key="carbonFootprint" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Carbon Footprint')}</h2>
            <p className="text-sm text-muted-foreground">{t('Climate impact across the product lifecycle')}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${RATING_GRADIENT_COLORS[product.carbonFootprint!.rating]} flex items-center justify-center shadow-lg`}>
              <span className="text-5xl font-bold text-white">{product.carbonFootprint!.rating}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{product.carbonFootprint!.totalKgCO2} {t('kg CO2')}</p>
            <p className="text-sm text-muted-foreground">{t(RATING_DESCRIPTIONS[product.carbonFootprint!.rating])}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold">{product.carbonFootprint!.productionKgCO2} kg</p>
              <p className="text-sm text-muted-foreground">{t('Production')}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold">{product.carbonFootprint!.transportKgCO2} kg</p>
              <p className="text-sm text-muted-foreground">{t('Transport')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecycling = () => {
    return (
      <div key="recycling" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Recycle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Recycling & Disposal')}</h2>
            <p className="text-sm text-muted-foreground">{t('Guide for environmentally friendly disposal')}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-green-500" strokeLinecap="round" strokeDasharray={`${product.recyclability.recyclablePercentage * 2.64} 264`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">{product.recyclability.recyclablePercentage}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('Recyclable')}</p>
          {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
            <div className="w-full p-4 bg-muted/50 rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                {t('Recycling Instructions')}
              </h4>
              <SafeHtml html={product.recyclability.instructions} className="text-sm text-muted-foreground" />
            </div>
          )}
          {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
            <div className="w-full">
              <h4 className="font-medium mb-2 text-sm">{t('Disposal Methods')}</h4>
              <div className="flex flex-wrap gap-2">
                {product.recyclability.disposalMethods.map((method, index) => (
                  <span key={index} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{method}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCertifications = () => {
    return (
      <div key="certifications" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Certifications')}</h2>
            <p className="text-sm text-muted-foreground">{t('Verified quality and sustainability standards')}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.certifications.map((cert, index) => (
            <div key={index} className="p-4 rounded-xl bg-muted/30 ring-1 ring-black/5 hover:ring-primary/30 transition-all flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{cert.name}</p>
                  <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t('Valid until')}: {formatDate(cert.validUntil, locale)}</p>
                <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">{t('Valid')}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSupplyChain = () => {
    return (
      <div key="supplyChain" className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 style={headingStyle} className="text-xl">{t('Supply Chain')}</h2>
            <p className="text-sm text-muted-foreground">{t('The journey of your product from raw material to you')}</p>
          </div>
        </div>
        <div className="space-y-0">
          {product.supplyChain.map((entry, index) => {
            const isLast = index === product.supplyChain.length - 1;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md`} style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}b3)` }}>
                    {entry.step}
                  </div>
                  {!isLast && <div className="w-0.5 h-10" style={{ background: `linear-gradient(to bottom, ${primaryColor}66, ${primaryColor}1a)` }} />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="font-medium">{entry.description}</p>
                  {isFieldVisible('supplyChainProcessType') && entry.processType && (
                    <p className="text-xs text-primary font-medium mt-0.5">{t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {entry.location}, {entry.country}
                  </p>
                  {isFieldVisible('supplyChainEmissions') && entry.emissionsKg != null && (
                    <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
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

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Header */}
      {heroResult && (
      <div className="relative overflow-hidden" style={heroResult.style}>
        {heroResult.overlayStyle && <div style={heroResult.overlayStyle} />}
        <div className="container mx-auto px-4 py-10 sm:py-16 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-2/5 flex-shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-72 object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-4 text-center md:text-left">
              {isFieldVisible('name') && (
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{product.name}</h1>
              )}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {isFieldVisible('category') && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                    {product.category}
                  </span>
                )}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white ${RATING_BG_COLORS[product.carbonFootprint.rating]}`}>
                    CO2: {product.carbonFootprint.rating}
                  </span>
                )}
              </div>
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {isFieldVisible('description') && (
                <SafeHtml html={product.description} className="text-foreground/80 text-lg leading-relaxed max-w-xl" />
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="container mx-auto px-4 space-y-8">
        {consumerSections.map(s => renderSection(s))}

        <DPPESPRSections
          product={product}
          isFieldVisible={isFieldVisible}
          cardStyle={styles.card}
          headingStyle={styles.heading}
          primaryColor={design.colors.secondaryColor}
          t={t}
        />
      </div>

      {ticketCreationEnabled && tenantId && (
        <PublicProductTicketDialog
          open={ticketDialogOpen}
          onOpenChange={setTicketDialogOpen}
          tenantId={tenantId}
          productName={product.name}
          gtin={product.gtin}
          serialNumber={product.serialNumber || ''}
        />
      )}
    </div>
  );
}

function ModernCustomsView({ data, primaryColor }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, design } = data;
  const { card: cardStyle, heading: headingStyle, hero: heroResult } = styles;

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Header */}
      {heroResult && (
      <div className="relative overflow-hidden" style={heroResult.style}>
        {heroResult.overlayStyle && <div style={heroResult.overlayStyle} />}
        <div className="container mx-auto px-4 py-10 sm:py-16 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-1/3 flex-shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-4">
              {isFieldVisible('name') && (
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {/* Identifier Badges */}
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('gtin') && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">GTIN</span>
                    {product.gtin}
                  </span>
                )}
                {isFieldVisible('serialNumber') && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('Serial Number')}</span>
                    {product.serialNumber}
                  </span>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('Batch Number')}</span>
                    {product.batchNumber}
                  </span>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-mono">
                    <span className="text-muted-foreground text-xs">{t('HS Code')}</span>
                    {product.hsCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="container mx-auto px-4 space-y-8">
        {/* Customs Data */}
        <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 style={headingStyle} className="text-xl">{t('Customs Data')}</h2>
              <p className="text-sm text-muted-foreground">{t('Information for customs clearance and import/export')}</p>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Product Data */}
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4" />
                {t('Product Data')}
              </h4>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Country of Origin')}</span>
                  <span className="font-medium">{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Net Weight')}</span>
                  <span className="font-medium">{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Gross Weight')}</span>
                  <span className="font-medium">{product.grossWeight} g</span>
                </div>
              )}
              <div className="flex justify-between py-2.5 border-b">
                <span className="text-muted-foreground">{t('Production Date')}</span>
                <span className="font-medium">{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>
            {/* Manufacturer Data */}
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                {t('Manufacturer Data')}
              </h4>
              <div className="flex justify-between py-2.5 border-b">
                <span className="text-muted-foreground">{t('Company')}</span>
                <span className="font-medium">{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('Address')}</span>
                  <span className="font-medium text-right text-sm">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('EORI Number')}</span>
                  <span className="font-mono font-medium">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-2.5 border-b">
                  <span className="text-muted-foreground">{t('VAT ID')}</span>
                  <span className="font-mono font-medium">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Materials Table */}
        {isFieldVisible('materials') && getProductMaterials(product).length > 0 && (
          <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h2 style={headingStyle} className="text-xl">{t('Material Composition')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 font-medium text-muted-foreground">{t('Material')}</th>
                    <th className="py-3 font-medium text-muted-foreground text-right">{t('Share')}</th>
                    <th className="py-3 font-medium text-muted-foreground text-center">{t('Recyclable')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Origin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {getProductMaterials(product).map((material, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3 font-medium">{material.name}</td>
                      <td className="py-3 text-right font-mono">{material.percentage}%</td>
                      <td className="py-3 text-center">
                        {material.recyclable ? (
                          <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">{t('Yes')}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{t('No')}</Badge>
                        )}
                      </td>
                      <td className="py-3">{material.origin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Certifications with Downloads */}
        {isFieldVisible('certifications') && product.certifications.length > 0 && (
          <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <h2 style={headingStyle} className="text-xl">{t('Certifications')}</h2>
            </div>
            <div className="space-y-3">
              {product.certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 ring-1 ring-black/5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cert.issuedBy} | {t('Valid until')}: {formatDate(cert.validUntil, locale)}
                      </p>
                    </div>
                  </div>
                  {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                    <Button variant="outline" size="sm" className="rounded-lg">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Supply Chain */}
        {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
          <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h2 style={headingStyle} className="text-xl">{t('Full Supply Chain')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 font-medium text-muted-foreground">{t('Step')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Description')}</th>
                    {isFieldVisible('supplyChainProcessType') && <th className="py-3 font-medium text-muted-foreground">{t('Process Type')}</th>}
                    <th className="py-3 font-medium text-muted-foreground">{t('Location')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Country')}</th>
                    <th className="py-3 font-medium text-muted-foreground">{t('Date')}</th>
                    {isFieldVisible('supplyChainTransport') && <th className="py-3 font-medium text-muted-foreground">{t('Transport Mode')}</th>}
                    {isFieldVisible('supplyChainEmissions') && <th className="py-3 font-medium text-muted-foreground">{t('Emissions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3">
                        <Badge variant="outline" className="font-mono">{entry.step}</Badge>
                      </td>
                      <td className="py-3 font-medium">{entry.description}</td>
                      {isFieldVisible('supplyChainProcessType') && <td className="py-3">{entry.processType ? t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '-'}</td>}
                      <td className="py-3">{entry.location}</td>
                      <td className="py-3">{entry.country}</td>
                      <td className="py-3">{formatDate(entry.date, locale)}</td>
                      {isFieldVisible('supplyChainTransport') && <td className="py-3">{entry.transportMode ? t(entry.transportMode.charAt(0).toUpperCase() + entry.transportMode.slice(1)) : '-'}</td>}
                      {isFieldVisible('supplyChainEmissions') && <td className="py-3">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Carbon Footprint */}
        {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
          <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <h2 style={headingStyle} className="text-xl">{t('Carbon Footprint')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Total')}</p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Production')}</p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold">{product.carbonFootprint.transportKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Transport')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Support & Service */}
        {isFieldVisible('supportResources') && product.supportResources && (() => {
          const sr = product.supportResources!;
          const hasContent = sr.instructions || sr.assemblyGuide || (sr.videos && sr.videos.length > 0) || (sr.faq && sr.faq.length > 0) || sr.warranty || sr.repairInfo || (sr.spareParts && sr.spareParts.length > 0);
          if (!hasContent) return null;
          return (
            <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary/10">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 style={headingStyle} className="text-xl">{t('Support & Service')}</h2>
                  <p className="text-sm text-muted-foreground">{t('Customer support and product resources')}</p>
                </div>
              </div>
              <div className="space-y-6">
                {(sr.instructions || sr.assemblyGuide) && (
                  <div className="space-y-3">
                    {sr.instructions && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" />{t('Usage Instructions')}</h4>
                        <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />
                      </div>
                    )}
                    {sr.assemblyGuide && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" />{t('Assembly Guide')}</h4>
                        <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
                {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Video className="h-4 w-4" />{t('Videos')}</h4>
                    <div className="space-y-2">
                      {sr.videos.map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl ring-1 ring-black/5 hover:ring-primary/30 transition-all text-sm font-medium" style={{ color: primaryColor }}>
                          <Video className="h-4 w-4 flex-shrink-0" />
                          {v.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" />{t('FAQ')}</h4>
                    <div className="space-y-3">
                      {sr.faq.map((item, i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-xl">
                          <p className="font-medium text-sm">{item.question}</p>
                          <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isFieldVisible('supportWarranty') && sr.warranty && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />{t('Warranty')}</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sr.warranty.durationMonths != null && (
                        <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Warranty Duration')}</p><p className="font-medium text-sm">{t('{{months}} months', { months: sr.warranty.durationMonths })}</p></div>
                      )}
                      {sr.warranty.contactEmail && (
                        <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Contact Email')}</p><p className="font-medium text-sm">{sr.warranty.contactEmail}</p></div>
                      )}
                      {sr.warranty.contactPhone && (
                        <div className="p-3 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground">{t('Contact Phone')}</p><p className="font-medium text-sm">{sr.warranty.contactPhone}</p></div>
                      )}
                      {sr.warranty.terms && (
                        <div className="p-3 bg-muted/50 rounded-xl sm:col-span-2"><p className="text-xs text-muted-foreground">{t('Warranty Terms')}</p><SafeHtml html={sr.warranty.terms} className="text-sm mt-1" /></div>
                      )}
                    </div>
                  </div>
                )}
                {isFieldVisible('supportRepair') && sr.repairInfo && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Wrench className="h-4 w-4" />{t('Repair Information')}</h4>
                    <div className="space-y-2">
                      {sr.repairInfo.repairGuide && (
                        <div className="p-4 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground mb-1">{t('Repair Guide')}</p><SafeHtml html={sr.repairInfo.repairGuide} className="text-sm" /></div>
                      )}
                      {sr.repairInfo.repairabilityScore != null && (
                        <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between"><span className="text-sm">{t('Repairability Score')}</span><span className="font-bold text-lg" style={{ color: primaryColor }}>{sr.repairInfo.repairabilityScore}/10</span></div>
                      )}
                      {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
                        <div className="p-4 bg-muted/50 rounded-xl"><p className="text-xs text-muted-foreground mb-2">{t('Service Centers')}</p>{sr.repairInfo.serviceCenters.map((c, i) => <p key={i} className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>)}</div>
                      )}
                    </div>
                  </div>
                )}
                {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm"><Package className="h-4 w-4" />{t('Spare Parts')}</h4>
                    <div className="space-y-2">
                      {sr.spareParts.map((part, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl ring-1 ring-black/5">
                          <div>
                            <p className="font-medium text-sm">{part.name}</p>
                            {part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}
                          </div>
                          <div className="text-right">
                            {part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || '\u20AC'}</p>}
                            <p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p>
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

        <DPPESPRSections
          product={product}
          isFieldVisible={isFieldVisible}
          cardStyle={styles.card}
          headingStyle={styles.heading}
          primaryColor={design.colors.secondaryColor}
          t={t}
        />
      </div>
    </div>
  );
}
