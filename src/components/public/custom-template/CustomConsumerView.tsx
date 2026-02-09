/**
 * Consumer view orchestrator for the Custom DPP template.
 * Uses all sub-components and content renderers.
 */
import { useState, type ReactNode } from 'react';
import {
  Package, Leaf, Recycle, Award, Truck, HelpCircle,
} from 'lucide-react';
import type { DPPSectionId } from '@/types/database';
import type { RenderableSection } from '@/hooks/use-dpp-template-data';
import type { DPPTemplateData } from '@/hooks/use-dpp-template-data';
import { SECTION_INNER_PADDING_MAP, CONTENT_WIDTH_MAP, SECTION_SPACING_MAP } from '@/lib/dpp-design-defaults';
import { getPackagingMaterials } from '@/lib/dpp-template-helpers';
import { DPPSetComponentsSection } from '@/components/public/DPPSetComponentsSection';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
import { PublicProductTicketDialog } from '@/components/public/PublicProductTicketDialog';
import { usePublicTicketCreationEnabled } from '@/hooks/usePublicTicketCreationEnabled';

import { CustomProductHeader } from './CustomProductHeader';
import { CustomSectionWrapper } from './CustomSectionWrapper';
import { CustomSectionHeader } from './CustomSectionHeader';
import { CustomFooter } from './CustomFooter';
import { CustomBackgroundPattern } from './CustomBackgroundPattern';
import { useCustomAnimations } from './useCustomAnimations';
import { MaterialsRenderer } from './content-renderers/MaterialsRenderer';
import { CarbonFootprintRenderer } from './content-renderers/CarbonFootprintRenderer';
import { CertificationsRenderer } from './content-renderers/CertificationsRenderer';
import { SupplyChainRenderer } from './content-renderers/SupplyChainRenderer';
import { RecyclingRenderer } from './content-renderers/RecyclingRenderer';
import { SupportRenderer } from './content-renderers/SupportRenderer';

interface Props {
  data: DPPTemplateData;
  tenantId: string | null;
}

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

const SECTION_DESCRIPTIONS: Record<DPPSectionId, string> = {
  materials: 'Overview of product materials and composition',
  packaging: 'Packaging materials and recyclability',
  carbonFootprint: 'Environmental impact and carbon emissions',
  recycling: 'Recycling information and disposal methods',
  certifications: 'Quality and compliance certifications',
  supplyChain: 'Product journey from source to consumer',
  support: 'Support resources, warranty and repair',
  components: 'Set components and included items',
};

export function CustomConsumerView({ data, tenantId }: Props) {
  const { product, isFieldVisible, t, locale, styles, design, consumerSections } = data;
  const { card: cardStyle, heading: headingStyle } = styles;
  const cl = design.customLayout;
  const primaryColor = design.colors.secondaryColor;
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { enabled: ticketCreationEnabled } = usePublicTicketCreationEnabled(tenantId);
  const { register, getAnimationStyle } = useCustomAnimations(cl.entryAnimation, cl.animationStagger);
  const innerPadding = SECTION_INNER_PADDING_MAP[cl.sectionInnerPadding] || '1.5rem';
  const accentColor = cl.sectionAccentColor || primaryColor;

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

  const renderSectionContent = (id: DPPSectionId): ReactNode => {
    switch (id) {
      case 'materials':
        return (
          <MaterialsRenderer
            product={product}
            displayMode={cl.materialsDisplayMode}
            showDataLabels={cl.showDataLabels}
            isFieldVisible={isFieldVisible}
            primaryColor={primaryColor}
            t={t}
          />
        );
      case 'packaging': {
        const packagingMats = getPackagingMaterials(product);
        if (packagingMats.length === 0) return null;
        return (
          <div className="space-y-4">
            {packagingMats.map((material, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PackageIcon className="h-4 w-4 text-muted-foreground" />
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
        );
      }
      case 'carbonFootprint':
        return (
          <CarbonFootprintRenderer
            product={product}
            displayMode={cl.carbonDisplayMode}
            ratingVisualization={cl.ratingVisualization}
            primaryColor={primaryColor}
            compact={cl.compactMode}
            t={t}
          />
        );
      case 'recycling':
        return (
          <RecyclingRenderer
            product={product}
            displayMode={cl.recyclingDisplayMode}
            isFieldVisible={isFieldVisible}
            primaryColor={primaryColor}
            t={t}
          />
        );
      case 'certifications':
        return (
          <CertificationsRenderer
            certifications={product.certifications}
            displayMode={cl.certificationsDisplayMode}
            primaryColor={primaryColor}
            locale={locale}
            t={t}
          />
        );
      case 'supplyChain':
        return (
          <SupplyChainRenderer
            product={product}
            displayMode={cl.supplyChainDisplayMode}
            isFieldVisible={isFieldVisible}
            primaryColor={primaryColor}
            locale={locale}
            t={t}
          />
        );
      case 'support':
        return (
          <SupportRenderer
            product={product}
            displayMode={cl.supportDisplayMode}
            isFieldVisible={isFieldVisible}
            t={t}
            onContactSupport={() => setTicketDialogOpen(true)}
            ticketCreationEnabled={ticketCreationEnabled}
          />
        );
      case 'components':
        return product.productType === 'set' && product.components?.length ? (
          <DPPSetComponentsSection
            components={product.components}
            cardStyle={cardStyle}
            headingStyle={headingStyle}
            t={t}
          />
        ) : null;
      default:
        return null;
    }
  };

  const renderSection = (section: RenderableSection, index: number) => {
    if (section.id === 'components') {
      return product.productType === 'set' && product.components?.length ? (
        <DPPSetComponentsSection key="components" components={product.components} cardStyle={cardStyle} headingStyle={headingStyle} t={t} />
      ) : null;
    }

    const content = renderSectionContent(section.id);
    if (!content) return null;

    const header = (
      <CustomSectionHeader
        icon={SECTION_ICONS[section.id]}
        title={SECTION_TITLES[section.id]}
        description={t(SECTION_DESCRIPTIONS[section.id])}
        showDescription={cl.showSectionDescription}
        headerStyle={cl.headerStyle}
        iconStyle={cl.iconStyle}
        primaryColor={primaryColor}
        headingStyle={headingStyle}
      />
    );

    return (
      <CustomSectionWrapper
        key={section.id}
        id={section.id}
        header={header}
        sectionStyle={cl.sectionStyle}
        cardStyle={cardStyle}
        compact={cl.compactMode}
        showDividers={cl.showSectionDividers}
        sectionAccent={cl.sectionAccent}
        accentColor={accentColor}
        alternateBackground={cl.sectionBackgroundAlternate}
        index={index}
        animStyle={getAnimationStyle(section.id, index)}
        animRef={(el) => register(section.id, el)}
        innerPadding={innerPadding}
        watermarkIcon={SECTION_ICONS[section.id]}
      >
        {content}
      </CustomSectionWrapper>
    );
  };

  // Layout
  const fullWidthSections: DPPSectionId[] = ['supplyChain', 'support', 'components'];
  const sectionSpacing = SECTION_SPACING_MAP[cl.sectionSpacing] || '1.5rem';
  const contentWidth = CONTENT_WIDTH_MAP[cl.contentWidth] || '768px';

  const renderSections = () => {
    switch (cl.layoutMode) {
      case 'two-column': {
        const normal: { s: RenderableSection; i: number }[] = [];
        const fullWidth: { s: RenderableSection; i: number }[] = [];
        consumerSections.forEach((s, i) => {
          if (fullWidthSections.includes(s.id)) fullWidth.push({ s, i });
          else normal.push({ s, i });
        });
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: sectionSpacing }}>
              {normal.map(({ s, i }) => renderSection(s, i))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: sectionSpacing }}>
              {fullWidth.map(({ s, i }) => renderSection(s, i))}
            </div>
          </>
        );
      }

      case 'sidebar':
        return (
          <div className="flex flex-col md:flex-row" style={{ gap: sectionSpacing }}>
            <aside className="w-full md:w-72 md:sticky md:top-4 md:self-start flex-shrink-0">
              <CustomProductHeader
                product={product}
                isFieldVisible={isFieldVisible}
                headerLayout="stacked"
                imageDisplayStyle={cl.imageDisplayStyle}
                showBadges={cl.showProductBadges}
                cardStyle={cardStyle}
                headingStyle={headingStyle}
                primaryColor={primaryColor}
                t={t}
              />
            </aside>
            <main className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: sectionSpacing }}>
              {consumerSections.map((s, i) => renderSection(s, i))}
            </main>
          </div>
        );

      case 'single-column':
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: sectionSpacing }}>
            {consumerSections.map((s, i) => renderSection(s, i))}
          </div>
        );
    }
  };

  const showProductHeader = cl.layoutMode !== 'sidebar';

  return (
    <div
      className="relative mx-auto px-4 py-8"
      style={{ maxWidth: contentWidth, display: 'flex', flexDirection: 'column', gap: sectionSpacing }}
    >
      <CustomBackgroundPattern pattern={cl.backgroundPattern} />

      {showProductHeader && (
        <CustomProductHeader
          product={product}
          isFieldVisible={isFieldVisible}
          headerLayout={cl.productHeaderLayout}
          imageDisplayStyle={cl.imageDisplayStyle}
          showBadges={cl.showProductBadges}
          cardStyle={cardStyle}
          headingStyle={headingStyle}
          primaryColor={primaryColor}
          t={t}
        />
      )}

      {renderSections()}

      <DPPESPRSections
        product={product}
        isFieldVisible={isFieldVisible}
        cardStyle={cardStyle}
        headingStyle={headingStyle}
        primaryColor={primaryColor}
        t={t}
      />

      <CustomFooter
        footerStyle={cl.footerStyle}
        design={design}
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
