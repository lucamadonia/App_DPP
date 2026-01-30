import { useParams } from 'react-router-dom';
import {
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  MapPin,
  Info,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { isFieldVisibleForView } from '@/types/visibility';
import { usePublicProduct } from '@/hooks/use-public-product';

// CO2 rating colors
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

export function PublicCustomerPage() {
  const { gtin, serial } = useParams();
  const { product, visibilityV2, loading } = usePublicProduct(gtin, serial);

  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, 'consumer');
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
              <h1 className="text-xl font-bold">Loading product data...</h1>
              <p className="text-muted-foreground">Please wait a moment.</p>
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
              <h1 className="text-xl font-bold">Product not found</h1>
              <p className="text-muted-foreground">
                The product with GTIN <code className="font-mono bg-muted px-1 rounded">{gtin}</code> and
                serial number <code className="font-mono bg-muted px-1 rounded">{serial}</code> was not found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Product Header */}
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
              <div className="flex flex-wrap gap-2">
                {isFieldVisible('category') && (
                  <Badge variant="secondary">{product.category}</Badge>
                )}
                {isFieldVisible('carbonRating') && product.carbonFootprint && (
                  <Badge className={`${ratingColors[product.carbonFootprint.rating]} text-white`}>
                    CO2 Rating: {product.carbonFootprint.rating}
                  </Badge>
                )}
              </div>
              {isFieldVisible('manufacturer') && (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {product.manufacturer}
                </p>
              )}
              {isFieldVisible('description') && (
                <p className="text-foreground">{product.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      {isFieldVisible('materials') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Composition
            </CardTitle>
            <CardDescription>
              Materials used and their origins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.materials.map((material, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{material.name}</span>
                    {material.recyclable && (
                      <Badge variant="outline" className="text-xs">
                        <Recycle className="h-3 w-3 mr-1" />
                        Recyclable
                      </Badge>
                    )}
                  </div>
                  <span className="font-bold">{material.percentage}%</span>
                </div>
                <Progress value={material.percentage} className="h-2" />
                {isFieldVisible('materialOrigins') && material.origin && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Origin: {material.origin}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Carbon Footprint */}
      {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Carbon Footprint
            </CardTitle>
            <CardDescription>
              Climate impact across the product lifecycle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rating */}
            <div className="flex items-center justify-center gap-4">
              <div
                className={`w-20 h-20 rounded-full ${ratingColors[product.carbonFootprint.rating]} text-white flex items-center justify-center text-4xl font-bold`}
              >
                {product.carbonFootprint.rating}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {product.carbonFootprint.totalKgCO2} kg CO2
                </p>
                <p className="text-sm text-muted-foreground">
                  {ratingDescriptions[product.carbonFootprint.rating]}
                </p>
              </div>
            </div>

            <Separator />

            {/* Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{product.carbonFootprint.productionKgCO2} kg</p>
                <p className="text-sm text-muted-foreground">Production</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{product.carbonFootprint.transportKgCO2} kg</p>
                <p className="text-sm text-muted-foreground">Transport</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recycling */}
      {isFieldVisible('recyclability') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Recycle className="h-5 w-5" />
              Recycling & Disposal
            </CardTitle>
            <CardDescription>
              Guide for environmentally friendly disposal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  {product.recyclability.recyclablePercentage}%
                </div>
                <p className="text-sm text-muted-foreground">Recyclable</p>
              </div>
              <Progress value={product.recyclability.recyclablePercentage} className="flex-1 h-4" />
            </div>

            {isFieldVisible('recyclingInstructions') && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Recycling Instructions
                </h4>
                <p className="text-sm text-muted-foreground">
                  {product.recyclability.instructions}
                </p>
              </div>
            )}

            {isFieldVisible('disposalMethods') && (
              <div>
                <h4 className="font-medium mb-2">Disposal Methods</h4>
                <div className="flex flex-wrap gap-2">
                  {product.recyclability.disposalMethods.map((method, index) => (
                    <Badge key={index} variant="outline">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {isFieldVisible('certifications') && product.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>
              Verified quality and sustainability standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {product.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-muted/30 flex flex-col justify-between"
                >
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Valid until: {new Date(cert.validUntil).toLocaleDateString('en-US')}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simplified Supply Chain */}
      {isFieldVisible('supplyChainSimple') && product.supplyChain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Supply Chain
            </CardTitle>
            <CardDescription>
              The journey of your product from raw material to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.supplyChain.map((entry, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {entry.step}
                    </div>
                    {index < product.supplyChain.length - 1 && (
                      <div className="w-0.5 h-8 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {entry.location}, {entry.country}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
