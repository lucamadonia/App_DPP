/**
 * Customs view orchestrator — now customizable with independent settings.
 */
import { useState, type ReactNode } from 'react';
import {
  Package, Leaf, Award, Truck, Globe, Building2, ShieldCheck, Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/format';
import type { DPPTemplateData } from '@/hooks/use-dpp-template-data';
import type { DPPCustomSectionStyle, DPPCustomHeaderStyle } from '@/types/database';
import { SECTION_INNER_PADDING_MAP } from '@/lib/dpp-design-defaults';
import { DPPESPRSections } from '@/components/public/DPPESPRSections';
import { CustomSectionHeader } from './CustomSectionHeader';

interface Props {
  data: DPPTemplateData;
  tenantId: string | null;
}

export function CustomCustomsView({ data }: Props) {
  const { product, isFieldVisible, t, locale, styles, design } = data;
  const { card: cardStyle, heading: headingStyle } = styles;
  const cl = design.customLayout;
  const primaryColor = design.colors.secondaryColor;

  // Customs-specific overrides (independent from consumer)
  const sectionStyle = cl.customsSectionStyle;
  const headerStyleVal = cl.customsHeaderStyle;
  const compact = cl.customsCompactMode;
  const showDividers = cl.customsShowSectionDividers;
  const layoutMode = cl.customsLayoutMode;
  const [activeTab, setActiveTab] = useState('product');

  const renderHeader = (icon: ReactNode, title: string, desc?: string) => (
    <CustomSectionHeader
      icon={icon}
      title={title}
      description={desc}
      showDescription={cl.showSectionDescription}
      headerStyle={headerStyleVal}
      iconStyle={cl.iconStyle}
      primaryColor={primaryColor}
      headingStyle={headingStyle}
    />
  );

  const padding = compact ? 'p-4' : 'p-6';

  // Sections
  const productIdentifiers = (
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
  );

  const customsDataSection = (
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
  );

  const materialsSection = isFieldVisible('materials') && product.materials.length > 0 ? (
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
          {product.materials.map((m, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 font-medium">{m.name}</td>
              <td className="py-2 text-right">{m.percentage}%</td>
              <td className="py-2 text-center">
                <Badge variant={m.recyclable ? 'secondary' : 'outline'} className="text-xs">
                  {m.recyclable ? t('Yes') : t('No')}
                </Badge>
              </td>
              <td className="py-2">{m.origin || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

  const certsSection = isFieldVisible('certifications') && product.certifications.length > 0 ? (
    <div className="space-y-3">
      {product.certifications.map((cert, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
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
  ) : null;

  const supplyChainSection = isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 ? (
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
          {product.supplyChain.map((entry, i) => (
            <tr key={i} className="border-b">
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
  ) : null;

  const carbonSection = isFieldVisible('carbonFootprint') && product.carbonFootprint ? (
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
  ) : null;

  // Wrap in section style
  const wrapInStyle = (key: string, header: ReactNode, content: ReactNode) => {
    if (!content) return null;
    if (sectionStyle === 'flat') {
      return (
        <div key={key} className={padding}>
          <div className={compact ? 'mb-2' : 'mb-4'}>{header}</div>
          {content}
          {showDividers && <Separator className={compact ? 'mt-3' : 'mt-6'} />}
        </div>
      );
    }
    return (
      <Card key={key} style={cardStyle}>
        <CardHeader>{header}</CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  };

  // Tabbed mode for customs
  if (layoutMode === 'tabbed') {
    const tabs = [
      { id: 'product', label: t('Product & Customs') },
      { id: 'materials', label: t('Materials') },
      { id: 'certifications', label: t('Certifications') },
      { id: 'supply-chain', label: t('Supply Chain') },
      { id: 'carbon', label: t('Carbon Footprint') },
    ].filter(tab => {
      if (tab.id === 'materials') return materialsSection;
      if (tab.id === 'certifications') return certsSection;
      if (tab.id === 'supply-chain') return supplyChainSection;
      if (tab.id === 'carbon') return carbonSection;
      return true;
    });

    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Product Header */}
        <Card style={cardStyle}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {isFieldVisible('image') && product.imageUrl && (
                <div className="w-full md:w-48 flex-shrink-0">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-48 md:h-full object-cover rounded-lg border" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                {isFieldVisible('name') && <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>}
                {isFieldVisible('manufacturer') && (
                  <p className="text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />{product.manufacturer}</p>
                )}
                {productIdentifiers}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'product' && wrapInStyle('customs', renderHeader(<ShieldCheck className="h-5 w-5" />, t('Customs Data'), t('Information for customs clearance and import/export')), customsDataSection)}
        {activeTab === 'materials' && wrapInStyle('materials', renderHeader(<Package className="h-5 w-5" />, t('Material Composition')), materialsSection)}
        {activeTab === 'certifications' && wrapInStyle('certs', renderHeader(<Award className="h-5 w-5" />, t('Certifications')), certsSection)}
        {activeTab === 'supply-chain' && wrapInStyle('sc', renderHeader(<Truck className="h-5 w-5" />, t('Full Supply Chain')), supplyChainSection)}
        {activeTab === 'carbon' && wrapInStyle('carbon', renderHeader(<Leaf className="h-5 w-5" />, t('Carbon Footprint')), carbonSection)}

        <DPPESPRSections product={product} isFieldVisible={isFieldVisible} cardStyle={cardStyle} headingStyle={headingStyle} primaryColor={primaryColor} t={t} />
      </div>
    );
  }

  // Single-column or two-column layout
  const allSections = [
    wrapInStyle('customs', renderHeader(<ShieldCheck className="h-5 w-5" />, t('Customs Data'), t('Information for customs clearance and import/export')), customsDataSection),
    wrapInStyle('materials', renderHeader(<Package className="h-5 w-5" />, t('Material Composition')), materialsSection),
    wrapInStyle('certs', renderHeader(<Award className="h-5 w-5" />, t('Certifications')), certsSection),
    wrapInStyle('sc', renderHeader(<Truck className="h-5 w-5" />, t('Full Supply Chain')), supplyChainSection),
    wrapInStyle('carbon', renderHeader(<Leaf className="h-5 w-5" />, t('Carbon Footprint')), carbonSection),
  ].filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header */}
      <Card style={cardStyle}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-48 flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 md:h-full object-cover rounded-lg border" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              {isFieldVisible('name') && <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />{product.manufacturer}</p>
              )}
              {productIdentifiers}
            </div>
          </div>
        </CardContent>
      </Card>

      {layoutMode === 'two-column' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allSections}
        </div>
      ) : (
        <div className="space-y-6">{allSections}</div>
      )}

      <DPPESPRSections product={product} isFieldVisible={isFieldVisible} cardStyle={cardStyle} headingStyle={headingStyle} primaryColor={primaryColor} t={t} />
    </div>
  );
}
