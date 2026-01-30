import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Package,
  Leaf,
  Award,
  Truck,
  Download,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isFieldVisibleForView } from '@/types/visibility';
import { usePublicProduct } from '@/hooks/use-public-product';

export function PublicCustomsPage() {
  const { t } = useTranslation('dpp');
  const locale = useLocale();
  const { gtin, serial } = useParams();
  const { product, visibilityV2, loading } = usePublicProduct(gtin, serial);

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, 'customs');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-bold">{t('Loading product data...')}</h1>
              <p className="text-muted-foreground">{t('Please wait a moment.')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">{t('Product not found')}</h1>
              <p className="text-muted-foreground">
                {t('The product with GTIN {{gtin}} and serial number {{serial}} was not found.', { gtin, serial })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header with Identifiers */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {isFieldVisible('image') && product.imageUrl && (
              <div className="w-full md:w-1/3">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="flex-1 space-y-4">
              {isFieldVisible('name') && (
                <h1 className="text-3xl font-bold">{product.name}</h1>
              )}
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}

              {/* Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {isFieldVisible('gtin') && (
                  <div>
                    <p className="text-xs text-muted-foreground">GTIN</p>
                    <p className="font-mono font-semibold">{product.gtin}</p>
                  </div>
                )}
                {isFieldVisible('serialNumber') && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Serial Number')}</p>
                    <p className="font-mono font-semibold">{product.serialNumber}</p>
                  </div>
                )}
                {isFieldVisible('batchNumber') && product.batchNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Batch Number')}</p>
                    <p className="font-mono font-semibold">{product.batchNumber}</p>
                  </div>
                )}
                {isFieldVisible('hsCode') && product.hsCode && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('HS Code')}</p>
                    <p className="font-mono font-semibold">{product.hsCode}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customs-relevant Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('Customs Data')}
          </CardTitle>
          <CardDescription>
            {t('Information for customs clearance and import/export')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Origin & Weight */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('Product Data')}
              </h4>
              <div className="space-y-2">
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
                  <span className="font-medium">
                    {formatDate(product.productionDate, locale)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manufacturer Details */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('Manufacturer Data')}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t('Company')}</span>
                  <span className="font-medium">{product.manufacturer}</span>
                </div>
                {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">{t('Address')}</span>
                    <span className="font-medium text-right text-sm">
                      {product.manufacturerAddress}
                    </span>
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
          </div>
        </CardContent>
      </Card>

      {/* Materials (detailed) */}
      {isFieldVisible('materials') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

      {/* Certificates with Download */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t('Certifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cert.issuedBy} | {t('Valid until')}:{' '}
                      {formatDate(cert.validUntil, locale)}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                    <th className="text-left py-2">{t('Location')}</th>
                    <th className="text-left py-2">{t('Country')}</th>
                    <th className="text-left py-2">{t('Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.supplyChain.map((entry, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        <Badge variant="outline">{entry.step}</Badge>
                      </td>
                      <td className="py-2 font-medium">{entry.description}</td>
                      <td className="py-2">{entry.location}</td>
                      <td className="py-2">{entry.country}</td>
                      <td className="py-2">
                        {formatDate(entry.date, locale)}
                      </td>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              {t('Carbon Footprint')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Total')}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                <p className="text-sm text-muted-foreground">{t('kg CO2 Production')}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
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
