import { useState, type CSSProperties, type ReactNode } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings, DPPSectionId } from '@/types/database';
import { useDPPTemplateData, type RenderableSection } from '@/hooks/use-dpp-template-data';
import { RATING_BG_COLORS, RATING_DESCRIPTIONS, getProductMaterials, getPackagingMaterials } from '@/lib/dpp-template-helpers';
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

// Section icons used for icon-left and other header styles
const SECTION_ICONS: Record<DPPSectionId, ReactNode> = {
  materials: <Package className="h-5 w-5" />,
  packaging: <Package className="h-5 w-5" />,
  carbonFootprint: <Leaf className="h-5 w-5" />,
  recycling: <Recycle className="h-5 w-5" />,
  certifications: <Award className="h-5 w-5" />,
  supplyChain: <Truck className="h-5 w-5" />,
  support: <HelpCircle className="h-5 w-5" />,
  components: <Package className="h-5 w-5" />,
};

export function TemplateCustom({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <CustomCustomsView data={data} tenantId={tenantId} />;
  }

  return <CustomConsumerView data={data} tenantId={tenantId} />;
}

interface ViewProps {
  data: ReturnType<typeof useDPPTemplateData>;
  tenantId: string | null;
}

// ============================================
// CONSUMER VIEW
// ============================================

function CustomConsumerView({ data, tenantId }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, design, consumerSections } = data;
  const { card: cardStyle, heading: headingStyle } = styles;
  const cl = design.customLayout;
  const compact = cl.compactMode;
  const spacing = compact ? 'space-y-3' : 'space-y-6';
  const padding = compact ? 'p-3' : 'p-6';
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);

  // ---- Section Header ----
  const renderSectionHeader = (icon: ReactNode, title: string, primaryColor: string) => {
    switch (cl.headerStyle) {
      case 'simple':
        return <h2 style={headingStyle} className="text-xl">{title}</h2>;
      case 'centered':
        return <h2 style={headingStyle} className="text-xl text-center">{title}</h2>;
      case 'underlined':
        return (
          <h2
            style={{ ...headingStyle, borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.5rem' }}
            className="text-xl"
          >
            {title}
          </h2>
        );
      case 'icon-left':
      default:
        return (
          <h2 style={headingStyle} className="text-xl flex items-center gap-2">
            <span style={{ color: primaryColor }}>{icon}</span>
            {title}
          </h2>
        );
    }
  };

  // ---- Section Wrapper ----
  const wrapSection = (id: DPPSectionId, icon: ReactNode, title: string, content: ReactNode) => {
    const primaryColor = design.colors.secondaryColor;

    switch (cl.sectionStyle) {
      case 'flat':
        return (
          <div key={id}>
            <div className={compact ? 'mb-2' : 'mb-4'}>
              {renderSectionHeader(icon, title, primaryColor)}
            </div>
            {content}
            {cl.showSectionDividers && <Separator className={compact ? 'mt-3' : 'mt-6'} />}
          </div>
        );

      case 'accordion':
        return (
          <Accordion key={id} type="single" collapsible defaultValue={id}>
            <AccordionItem value={id} className="border rounded-lg" style={cardStyle}>
              <AccordionTrigger className={`${padding} hover:no-underline`}>
                {renderSectionHeader(icon, title, primaryColor)}
              </AccordionTrigger>
              <AccordionContent className={padding}>
                {content}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );

      case 'card':
      default:
        return (
          <div key={id} style={cardStyle} className={`${padding} rounded-lg`}>
            <div className={compact ? 'mb-2' : 'mb-4'}>
              {renderSectionHeader(icon, title, primaryColor)}
            </div>
            {content}
          </div>
        );
    }
  };

  // ---- Section Content Renderers ----
  const renderMaterials = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 text-sm font-medium text-muted-foreground">{t('Material')}</th>
              <th className="py-2 text-sm font-medium text-muted-foreground text-right">{t('Share')}</th>
              <th className="py-2 text-sm font-medium text-muted-foreground text-center">{t('Recyclable')}</th>
              {isFieldVisible('materialOrigins') && (
                <th className="py-2 text-sm font-medium text-muted-foreground">{t('Origin')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {getProductMaterials(product).map((material, index) => (
              <tr key={index} className="border-b last:border-b-0">
                <td className="py-3 font-medium">{material.name}</td>
                <td className="py-3 text-right">{material.percentage}%</td>
                <td className="py-3 text-center">
                  {material.recyclable ? (
                    <Badge variant="secondary" className="text-xs">{t('Yes')}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">{t('No')}</Badge>
                  )}
                </td>
                {isFieldVisible('materialOrigins') && (
                  <td className="py-3 text-sm">
                    {material.origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {material.origin}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPackaging = () => {
    const packagingMats = getPackagingMaterials(product);
    return (
      <div className="space-y-4">
        {isFieldVisible('packagingMaterials') && packagingMats.length > 0 && (
          <div className="space-y-4">
            {packagingMats.map((material, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{material.name}</span>
                    {isFieldVisible('materialOrigins') && material.origin && (
                      <p className="text-xs text-muted-foreground">{t('Origin')}: {material.origin}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {material.recyclable && (
                    <span className="text-xs text-green-600 flex items-center gap-1"><Recycle className="h-3 w-3" />{t('Recyclable')}</span>
                  )}
                  <span className="font-semibold">{material.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {isFieldVisible('packagingRecyclability') && product.recyclability?.packagingRecyclablePercentage != null && product.recyclability.packagingRecyclablePercentage > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('Packaging recyclable')}</span>
              <span className="font-semibold">{product.recyclability.packagingRecyclablePercentage}%</span>
            </div>
          </div>
        )}
        {isFieldVisible('packagingRecyclingInstructions') && product.recyclability?.packagingInstructions && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">{t('Packaging Recycling')}</p>
            <SafeHtml html={product.recyclability.packagingInstructions} className="text-sm text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  const renderCarbonFootprint = () => {
    return (
      <div className={spacing}>
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full ${RATING_BG_COLORS[product.carbonFootprint!.rating]} text-white flex items-center justify-center text-3xl font-bold`}
          >
            {product.carbonFootprint!.rating}
          </div>
          <div>
            <p className="font-semibold text-lg">{product.carbonFootprint!.totalKgCO2} {t('kg CO2')}</p>
            <p className="text-sm text-muted-foreground">{t(RATING_DESCRIPTIONS[product.carbonFootprint!.rating])}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{product.carbonFootprint!.productionKgCO2} kg</p>
            <p className="text-sm text-muted-foreground">{t('Production')}</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{product.carbonFootprint!.transportKgCO2} kg</p>
            <p className="text-sm text-muted-foreground">{t('Transport')}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderRecycling = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {product.recyclability.recyclablePercentage}%
            </div>
            <p className="text-sm text-muted-foreground">{t('Recyclable')}</p>
          </div>
          <Progress value={product.recyclability.recyclablePercentage} className="flex-1 h-3" />
        </div>
        {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('Recycling Instructions')}
            </h4>
            <SafeHtml html={product.recyclability.instructions} className="text-sm text-muted-foreground" />
          </div>
        )}
        {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">{t('Disposal Methods')}</h4>
            <div className="flex flex-wrap gap-2">
              {product.recyclability.disposalMethods.map((method, index) => (
                <Badge key={index} variant="outline">{method}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCertifications = () => {
    return (
      <div className="space-y-3">
        {product.certifications.map((cert, index) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-semibold">{cert.name}</p>
              <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs mb-1">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {t('Valid')}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {t('Valid until')}: {formatDate(cert.validUntil, locale)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSupplyChain = () => {
    return (
      <ol className="space-y-4">
        {product.supplyChain.map((entry, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center text-sm font-bold">
              {entry.step}
            </span>
            <div className="flex-1 pt-1">
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
                  {entry.emissionsKg} kg CO₂
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  };

  const renderSupport = () => {
    const sr = product.supportResources!;
    return (
      <div className={spacing}>
        {(sr.instructions || sr.assemblyGuide) && (
          <div className="space-y-3">
            {sr.instructions && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4" />{t('Usage Instructions')}</h4>
                <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />
              </div>
            )}
            {sr.assemblyGuide && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4" />{t('Assembly Guide')}</h4>
                <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
              </div>
            )}
          </div>
        )}
        {isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2"><Video className="h-4 w-4" />{t('Videos')}</h4>
            <div className="space-y-2">
              {sr.videos.map((v, i) => (
                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-primary">
                  <Video className="h-4 w-4 flex-shrink-0" />{v.title}
                </a>
              ))}
            </div>
          </div>
        )}
        {isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" />{t('FAQ')}</h4>
            <div className="space-y-3">
              {sr.faq.map((item, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <p className="font-medium text-sm">{item.question}</p>
                  <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}
        {isFieldVisible('supportWarranty') && sr.warranty && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{t('Warranty')}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {sr.warranty.durationMonths != null && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Warranty Duration')}</span><span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span></div>
              )}
              {sr.warranty.contactEmail && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Contact Email')}</span><span className="font-medium">{sr.warranty.contactEmail}</span></div>
              )}
              {sr.warranty.contactPhone && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Contact Phone')}</span><span className="font-medium">{sr.warranty.contactPhone}</span></div>
              )}
            </div>
            {sr.warranty.terms && (
              <div className="mt-3 p-3 border rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t('Warranty Terms')}</p><SafeHtml html={sr.warranty.terms} className="text-sm" /></div>
            )}
          </div>
        )}
        {isFieldVisible('supportRepair') && sr.repairInfo && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2"><Wrench className="h-4 w-4" />{t('Repair Information')}</h4>
            {sr.repairInfo.repairGuide && <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-muted-foreground mb-2" />}
            {sr.repairInfo.repairabilityScore != null && (
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Repairability Score')}</span><span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span></div>
            )}
            {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
              <div className="mt-2"><p className="text-sm font-medium mb-1">{t('Service Centers')}</p>{sr.repairInfo.serviceCenters.map((c, i) => <p key={i} className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>)}</div>
            )}
          </div>
        )}
        {isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2"><Package className="h-4 w-4" />{t('Spare Parts')}</h4>
            <div className="space-y-2">
              {sr.spareParts.map((part, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><p className="font-medium text-sm">{part.name}</p>{part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}</div>
                  <div className="text-right">{part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || '€'}</p>}<p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>{part.available !== false ? t('Available') : t('Out of stock')}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {ticketCreationEnabled && (
          <div className="pt-4 border-t">
            <Button onClick={() => setTicketDialogOpen(true)} className="w-full" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('Contact Support')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ---- Section Map ----
  const SECTION_TITLES: Record<DPPSectionId, string> = {
    materials: t('Material Composition'),
    packaging: t('Packaging Materials'),
    carbonFootprint: t('Carbon Footprint'),
    recycling: t('Recycling & Disposal'),
    certifications: t('Certifications'),
    supplyChain: t('Supply Chain'),
    support: t('Support & Service'),
    components: t('Components'),
  };

  const renderSection = (section: RenderableSection) => {
    const icon = SECTION_ICONS[section.id];
    const title = SECTION_TITLES[section.id];

    let content: ReactNode;
    switch (section.id) {
      case 'materials': content = renderMaterials(); break;
      case 'packaging': content = renderPackaging(); break;
      case 'carbonFootprint': content = renderCarbonFootprint(); break;
      case 'recycling': content = renderRecycling(); break;
      case 'certifications': content = renderCertifications(); break;
      case 'supplyChain': content = renderSupplyChain(); break;
      case 'support': content = renderSupport(); break;
      case 'components':
        return product.productType === 'set' && product.components?.length ? (
          <DPPSetComponentsSection key="components" components={product.components} cardStyle={cardStyle} headingStyle={headingStyle} t={t} />
        ) : null;
      default: return null;
    }

    return wrapSection(section.id, icon, title, content);
  };

  // ---- Layout Wrapper ----
  const renderSections = () => {
    // Sections that span full width in two-column mode
    const fullWidthSections: DPPSectionId[] = ['supplyChain', 'support', 'components'];

    switch (cl.layoutMode) {
      case 'two-column': {
        const normal: RenderableSection[] = [];
        const fullWidth: RenderableSection[] = [];
        consumerSections.forEach(s => {
          if (fullWidthSections.includes(s.id)) {
            fullWidth.push(s);
          } else {
            normal.push(s);
          }
        });
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {normal.map(s => renderSection(s))}
            </div>
            <div className={spacing}>
              {fullWidth.map(s => renderSection(s))}
            </div>
          </>
        );
      }

      case 'sidebar': {
        return (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar: product info */}
            <aside className="w-full md:w-72 md:sticky md:top-4 md:self-start flex-shrink-0">
              <div style={cardStyle} className={`${padding} rounded-lg`}>
                {isFieldVisible('image') && product.imageUrl && (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                )}
                {isFieldVisible('name') && (
                  <h2 className="text-lg font-bold mb-1" style={headingStyle}>{product.name}</h2>
                )}
                {isFieldVisible('manufacturer') && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Building2 className="h-3 w-3" />{product.manufacturer}
                  </p>
                )}
                {isFieldVisible('category') && (
                  <Badge variant="outline" className="mb-2">{product.category}</Badge>
                )}
                {isFieldVisible('gtin') && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">GTIN</p>
                    <p className="font-mono text-sm">{product.gtin}</p>
                  </div>
                )}
                {isFieldVisible('serialNumber') && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">{t('Serial Number')}</p>
                    <p className="font-mono text-sm">{product.serialNumber}</p>
                  </div>
                )}
              </div>
            </aside>
            {/* Main: sections */}
            <main className={`flex-1 ${spacing}`}>
              {consumerSections.map(s => renderSection(s))}
            </main>
          </div>
        );
      }

      case 'single-column':
      default:
        return (
          <div className={spacing}>
            {consumerSections.map(s => renderSection(s))}
          </div>
        );
    }
  };

  // In sidebar mode, product header is shown in the sidebar itself
  const showProductHeader = cl.layoutMode !== 'sidebar';

  return (
    <div className={`container mx-auto px-4 py-8 ${spacing}`}>
      {/* Product Header (not in sidebar mode) */}
      {showProductHeader && (
        <div style={cardStyle} className={`${padding} rounded-lg`}>
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-48 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 md:h-full object-cover rounded-lg border" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />{product.manufacturer}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('category') && (
                  <Badge variant="outline">{product.category}</Badge>
                )}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <Badge className={`${RATING_BG_COLORS[product.carbonFootprint.rating]} text-white`}>
                    {t('CO2 Rating')}: {product.carbonFootprint.rating}
                  </Badge>
                )}
              </div>
              {isFieldVisible('description') && (
                <>
                  <Separator />
                  <SafeHtml html={product.description} className="text-foreground/90" />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {renderSections()}

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

// ============================================
// CUSTOMS VIEW (always single-column, card style)
// ============================================

function CustomCustomsView({ data }: ViewProps) {
  const { product, isFieldVisible, t, locale, styles, design } = data;
  const { card: cardStyle, heading: headingStyle } = styles;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header with Identifiers */}
      <Card style={cardStyle}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-48 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 md:h-full object-cover rounded-lg border" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />{product.manufacturer}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border rounded-lg">
                {isFieldVisible('gtin') && (
                  <div><p className="text-xs text-muted-foreground">GTIN</p><p className="font-mono font-semibold text-sm">{product.gtin}</p></div>
                )}
                {isFieldVisible('serialNumber') && (
                  <div><p className="text-xs text-muted-foreground">{t('Serial Number')}</p><p className="font-mono font-semibold text-sm">{product.serialNumber}</p></div>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <div><p className="text-xs text-muted-foreground">{t('Batch Number')}</p><p className="font-mono font-semibold text-sm">{product.batchNumber}</p></div>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <div><p className="text-xs text-muted-foreground">{t('HS Code')}</p><p className="font-mono font-semibold text-sm">{product.hsCode}</p></div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customs Data */}
      <Card style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}><ShieldCheck className="h-5 w-5" />{t('Customs Data')}</CardTitle>
          <CardDescription>{t('Information for customs clearance and import/export')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3"><Globe className="h-4 w-4" />{t('Product Data')}</h4>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Country of Origin')}</span><span className="font-medium">{product.countryOfOrigin}</span></div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Net Weight')}</span><span className="font-medium">{product.netWeight} g</span></div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Gross Weight')}</span><span className="font-medium">{product.grossWeight} g</span></div>
              )}
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Production Date')}</span><span className="font-medium">{formatDate(product.productionDate, locale)}</span></div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4" />{t('Manufacturer Data')}</h4>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Company')}</span><span className="font-medium">{product.manufacturer}</span></div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('Address')}</span><span className="font-medium text-right text-sm">{product.manufacturerAddress}</span></div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('EORI Number')}</span><span className="font-mono font-medium">{product.manufacturerEORI}</span></div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">{t('VAT ID')}</span><span className="font-mono font-medium">{product.manufacturerVAT}</span></div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={headingStyle}><Package className="h-5 w-5" />{t('Material Composition')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('Material')}</th>
                    <th className="text-right py-2">{t('Share')}</th>
                    <th className="text-center py-2">{t('Recyclable')}</th>
                    <th className="text-left py-2">{t('Origin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.materials.map((material, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-medium">{material.name}</td>
                      <td className="py-2 text-right">{material.percentage}%</td>
                      <td className="py-2 text-center">
                        {material.recyclable ? (
                          <Badge variant="secondary" className="text-xs">{t('Yes')}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{t('No')}</Badge>
                        )}
                      </td>
                      <td className="py-2">{material.origin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={headingStyle}><Award className="h-5 w-5" />{t('Certifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">{cert.issuedBy} | {t('Valid until')}: {formatDate(cert.validUntil, locale)}</p>
                  </div>
                  {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                    <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />PDF</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Supply Chain */}
      {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={headingStyle}><Truck className="h-5 w-5" />{t('Full Supply Chain')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('Step')}</th>
                    <th className="text-left py-2">{t('Description')}</th>
                    {isFieldVisible('supplyChainProcessType') && <th className="text-left py-2">{t('Process Type')}</th>}
                    <th className="text-left py-2">{t('Location')}</th>
                    <th className="text-left py-2">{t('Country')}</th>
                    <th className="text-left py-2">{t('Date')}</th>
                    {isFieldVisible('supplyChainTransport') && <th className="text-left py-2">{t('Transport Mode')}</th>}
                    {isFieldVisible('supplyChainEmissions') && <th className="text-left py-2">{t('Emissions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2"><Badge variant="outline">{entry.step}</Badge></td>
                      <td className="py-2 font-medium">{entry.description}</td>
                      {isFieldVisible('supplyChainProcessType') && <td className="py-2">{entry.processType ? t(entry.processType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '-'}</td>}
                      <td className="py-2">{entry.location}</td>
                      <td className="py-2">{entry.country}</td>
                      <td className="py-2">{formatDate(entry.date, locale)}</td>
                      {isFieldVisible('supplyChainTransport') && <td className="py-2">{entry.transportMode ? t(entry.transportMode.charAt(0).toUpperCase() + entry.transportMode.slice(1)) : '-'}</td>}
                      {isFieldVisible('supplyChainEmissions') && <td className="py-2">{entry.emissionsKg != null ? `${entry.emissionsKg} kg` : '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carbon Footprint */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={headingStyle}><Leaf className="h-5 w-5" />{t('Carbon Footprint')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Total')}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Production')}</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">{product.carbonFootprint.transportKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Transport')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
