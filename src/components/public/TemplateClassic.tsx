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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { resolveDesign, getCardStyle, getHeadingStyle, getSectionOrder, isSectionVisible } from '@/lib/dpp-design-utils';

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

const ratingDescriptions: Record<string, string> = {
  A: 'Excellent - well below average',
  B: 'Good - below average',
  C: 'Average',
  D: 'Above average',
  E: 'Well above average',
};

export function TemplateClassic({ product, visibilityV2, view, dppDesign }: DPPTemplateProps) {
  const { t } = useTranslation('dpp');
  const locale = useLocale();
  const design = resolveDesign(dppDesign);

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  if (view === 'customs') {
    return <ClassicCustomsView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} design={design} />;
  }

  return <ClassicConsumerView product={product} isFieldVisible={isFieldVisible} t={t} locale={locale} design={design} />;
}

interface ViewProps {
  product: Product;
  isFieldVisible: (field: string) => boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
  design: ReturnType<typeof resolveDesign>;
}

function ClassicConsumerView({ product, isFieldVisible, t, locale, design }: ViewProps) {
  const cardStyle = getCardStyle(design.cards);
  const headingStyle = getHeadingStyle(design.typography, design.colors);
  const sectionOrder = getSectionOrder(design);

  const renderSection = (sectionId: string) => {
    if (!isSectionVisible(design, sectionId as import('@/types/database').DPPSectionId)) return null;
    switch (sectionId) {
      case 'materials': return renderMaterials();
      case 'carbonFootprint': return renderCarbonFootprint();
      case 'recycling': return renderRecycling();
      case 'certifications': return renderCertifications();
      case 'supplyChain': return renderSupplyChain();
      default: return null;
    }
  };

  const renderMaterials = () => {
    if (!isFieldVisible('materials') || product.materials.length === 0) return null;
    return (
      <Card key="materials" style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <Package className="h-5 w-5" />
            {t('Material Composition')}
          </CardTitle>
          <CardDescription>{t('Materials used and their origins')}</CardDescription>
        </CardHeader>
        <CardContent>
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
                {product.materials.map((material, index) => (
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
        </CardContent>
      </Card>
    );
  };

  const renderCarbonFootprint = () => {
    if (!isFieldVisible('carbonFootprint') || !product.carbonFootprint) return null;
    return (
      <Card key="carbonFootprint" style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <Leaf className="h-5 w-5" />
            {t('Carbon Footprint')}
          </CardTitle>
          <CardDescription>{t('Climate impact across the product lifecycle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-full ${ratingColors[product.carbonFootprint.rating]} text-white flex items-center justify-center text-3xl font-bold`}
            >
              {product.carbonFootprint.rating}
            </div>
            <div>
              <p className="font-semibold text-lg">{product.carbonFootprint.totalKgCO2} {t('kg CO2')}</p>
              <p className="text-sm text-muted-foreground">{t(ratingDescriptions[product.carbonFootprint.rating])}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold">{product.carbonFootprint.productionKgCO2} kg</p>
              <p className="text-sm text-muted-foreground">{t('Production')}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold">{product.carbonFootprint.transportKgCO2} kg</p>
              <p className="text-sm text-muted-foreground">{t('Transport')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecycling = () => {
    if (!isFieldVisible('recyclability')) return null;
    return (
      <Card key="recycling" style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <Recycle className="h-5 w-5" />
            {t('Recycling & Disposal')}
          </CardTitle>
          <CardDescription>{t('Guide for environmentally friendly disposal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <p className="text-sm text-muted-foreground">{product.recyclability.instructions}</p>
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
        </CardContent>
      </Card>
    );
  };

  const renderCertifications = () => {
    if (!isFieldVisible('certifications') || product.certifications.length === 0) return null;
    return (
      <Card key="certifications" style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <Award className="h-5 w-5" />
            {t('Certifications')}
          </CardTitle>
          <CardDescription>{t('Verified quality and sustainability standards')}</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  };

  const renderSupplyChain = () => {
    if (!isFieldVisible('supplyChainSimple') || product.supplyChain.length === 0) return null;
    return (
      <Card key="supplyChain" style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <Truck className="h-5 w-5" />
            {t('Supply Chain')}
          </CardTitle>
          <CardDescription>{t('The journey of your product from raw material to you')}</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header */}
      <Card style={cardStyle}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-48 flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-48 md:h-full object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('category') && (
                  <Badge variant="outline">{product.category}</Badge>
                )}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <Badge className={`${ratingColors[product.carbonFootprint.rating]} text-white`}>
                    {t('CO2 Rating')}: {product.carbonFootprint.rating}
                  </Badge>
                )}
              </div>
              {isFieldVisible('description') && (
                <>
                  <Separator />
                  <p className="text-foreground/90">{product.description}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {sectionOrder.map(id => renderSection(id))}
    </div>
  );
}

function ClassicCustomsView({ product, isFieldVisible, t, locale, design }: ViewProps) {
  const cardStyle = getCardStyle(design.cards);
  const headingStyle = getHeadingStyle(design.typography, design.colors);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header with Identifiers */}
      <Card style={cardStyle}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-48 flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-48 md:h-full object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              {isFieldVisible('name') && (
                <h1 className="text-2xl font-bold" style={headingStyle}>{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border rounded-lg">
                {isFieldVisible('gtin') && (
                  <div>
                    <p className="text-xs text-muted-foreground">GTIN</p>
                    <p className="font-mono font-semibold text-sm">{product.gtin}</p>
                  </div>
                )}
                {isFieldVisible('serialNumber') && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Serial Number')}</p>
                    <p className="font-mono font-semibold text-sm">{product.serialNumber}</p>
                  </div>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Batch Number')}</p>
                    <p className="font-mono font-semibold text-sm">{product.batchNumber}</p>
                  </div>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('HS Code')}</p>
                    <p className="font-mono font-semibold text-sm">{product.hsCode}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customs Data */}
      <Card style={cardStyle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={headingStyle}>
            <ShieldCheck className="h-5 w-5" />
            {t('Customs Data')}
          </CardTitle>
          <CardDescription>{t('Information for customs clearance and import/export')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4" />
                {t('Product Data')}
              </h4>
              {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('Country of Origin')}</span>
                  <span className="font-medium">{product.countryOfOrigin}</span>
                </div>
              )}
              {isFieldVisible('netWeight') && product.netWeight && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('Net Weight')}</span>
                  <span className="font-medium">{product.netWeight} g</span>
                </div>
              )}
              {isFieldVisible('grossWeight') && product.grossWeight && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('Gross Weight')}</span>
                  <span className="font-medium">{product.grossWeight} g</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('Production Date')}</span>
                <span className="font-medium">{formatDate(product.productionDate, locale)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                {t('Manufacturer Data')}
              </h4>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('Company')}</span>
                <span className="font-medium">{product.manufacturer}</span>
              </div>
              {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('Address')}</span>
                  <span className="font-medium text-right text-sm">{product.manufacturerAddress}</span>
                </div>
              )}
              {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('EORI Number')}</span>
                  <span className="font-mono font-medium">{product.manufacturerEORI}</span>
                </div>
              )}
              {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('VAT ID')}</span>
                  <span className="font-mono font-medium">{product.manufacturerVAT}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      {isFieldVisible('materials') && product.materials.length > 0 && (
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={headingStyle}>
              <Package className="h-5 w-5" />
              {t('Material Composition')}
            </CardTitle>
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
            <CardTitle className="flex items-center gap-2" style={headingStyle}>
              <Award className="h-5 w-5" />
              {t('Certifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cert.issuedBy} | {t('Valid until')}: {formatDate(cert.validUntil, locale)}
                    </p>
                  </div>
                  {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
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
            <CardTitle className="flex items-center gap-2" style={headingStyle}>
              <Truck className="h-5 w-5" />
              {t('Full Supply Chain')}
            </CardTitle>
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
                      <td className="py-2">
                        <Badge variant="outline">{entry.step}</Badge>
                      </td>
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
            <CardTitle className="flex items-center gap-2" style={headingStyle}>
              <Leaf className="h-5 w-5" />
              {t('Carbon Footprint')}
            </CardTitle>
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
    </div>
  );
}
