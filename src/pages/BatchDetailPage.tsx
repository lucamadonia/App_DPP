import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  ArrowLeft,
  Edit,
  QrCode,
  ExternalLink,
  Loader2,
  Layers,
  Package,
  CheckCircle2,
  Clock,
  Archive,
  Settings2,
  Copy,
  Trash2,
  BrainCircuit,
  DollarSign,
  Truck,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getProductById } from '@/services/supabase';
import { getBatchById, deleteBatch } from '@/services/supabase/batches';
import { formatCurrency } from '@/lib/format';
import type { Product, ProductBatch } from '@/types/product';

const statusConfig = {
  live: { label: 'Live', icon: CheckCircle2, className: 'bg-success text-success-foreground' },
  draft: { label: 'Draft', icon: Clock, className: '' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-muted text-muted-foreground' },
};

export function BatchDetailPage() {
  const { t } = useTranslation('products');
  const locale = useLocale();
  const { id: productId, batchId } = useParams<{ id: string; batchId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [batch, setBatch] = useState<ProductBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!productId || !batchId) return;
      setIsLoading(true);

      const [productData, batchData] = await Promise.all([
        getProductById(productId),
        getBatchById(batchId),
      ]);

      setProduct(productData);
      setBatch(batchData);
      setIsLoading(false);
    }

    loadData();
  }, [productId, batchId]);

  const handleDelete = async () => {
    if (!batchId || !confirm('Are you sure you want to delete this batch?')) return;
    const result = await deleteBatch(batchId);
    if (result.success) {
      window.location.href = `/products/${productId}?tab=batches`;
    } else {
      alert('Error deleting batch: ' + result.error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product || !batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/products/${productId}?tab=batches`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch not found</h1>
            <p className="text-muted-foreground">The batch does not exist or you do not have access.</p>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[batch.status];
  const hasOverrides = !!(
    batch.materialsOverride ||
    batch.certificationsOverride ||
    batch.carbonFootprintOverride ||
    batch.recyclabilityOverride ||
    batch.descriptionOverride
  );

  // Merged values for display
  const displayDescription = batch.descriptionOverride || product.description;
  const displayMaterials = batch.materialsOverride || product.materials;
  const displayCertifications = batch.certificationsOverride || product.certifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/products/${productId}?tab=batches`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">{batch.serialNumber}</h1>
              <Badge variant="secondary" className={status.className}>
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {hasOverrides && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Settings2 className="mr-1 h-3 w-3" />
                  Overrides
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {product.name} · {product.gtin}
              {batch.batchNumber && ` · Batch ${batch.batchNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}?tab=ai-check&batchId=${batchId}`}>
              <BrainCircuit className="mr-2 h-4 w-4" />
              AI Check
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}?tab=master-label&batchId=${batchId}`}>
              <Tag className="mr-2 h-4 w-4" />
              {t('Master Label')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}/batches/new?duplicate=${batchId}`}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`/p/${product.gtin}/${batch.serialNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Public DPP
            </a>
          </Button>
          <Button asChild>
            <Link to={`/products/${productId}/batches/${batchId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Product Reference */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-6 text-sm">
              <Link to={`/products/${productId}`} className="font-medium hover:text-primary hover:underline">
                {product.name}
              </Link>
              <code className="font-mono text-muted-foreground">{product.gtin}</code>
              <span className="text-muted-foreground">{product.category}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Batch Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Batch Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <code className="font-mono font-medium">{batch.serialNumber}</code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Number</p>
                <p className="font-medium">{batch.batchNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Production Date</p>
                <p className="font-medium">{new Date(batch.productionDate).toLocaleDateString('en-US')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiration Date</p>
                <p className="font-medium">
                  {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString('en-US') : '-'}
                </p>
              </div>
              {batch.netWeight != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Net Weight</p>
                  <p className="font-medium">{batch.netWeight} g</p>
                </div>
              )}
              {batch.grossWeight != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Gross Weight</p>
                  <p className="font-medium">{batch.grossWeight} g</p>
                </div>
              )}
              {batch.quantity != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{batch.quantity} pcs</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary" className={status.className}>
                  <status.icon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(batch.createdAt).toLocaleDateString('en-US')}</p>
              </div>
            </div>
            {batch.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{batch.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Supplier */}
        {(batch.pricePerUnit != null || batch.supplierName) && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {t('Pricing & Supplier')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {batch.pricePerUnit != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Price per Unit')}</p>
                    <p className="font-medium">{formatCurrency(batch.pricePerUnit, batch.currency || 'EUR', locale)}</p>
                  </div>
                )}
                {batch.pricePerUnit != null && batch.quantity != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Total Price')}</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(batch.pricePerUnit * batch.quantity, batch.currency || 'EUR', locale)}
                    </p>
                  </div>
                )}
                {batch.supplierName && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{t('Supplier')}</p>
                    <p className="font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {batch.supplierName}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Public Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Public DPP Links
            </CardTitle>
            <CardDescription>Links to the public Digital Product Passport for this batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer View</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /p/{product.gtin}/{batch.serialNumber}
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a
                  href={`/p/${product.gtin}/${batch.serialNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Open Customer View
                </a>
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customs View</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /p/{product.gtin}/{batch.serialNumber}/customs
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a
                  href={`/p/${product.gtin}/${batch.serialNumber}/customs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Open Customs View
                </a>
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">GS1 Digital Link</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /01/{product.gtin}/21/{batch.serialNumber}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description (merged) */}
      {displayDescription && (
        <Card>
          <CardHeader>
            <CardTitle>
              Description
              {batch.descriptionOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{displayDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Materials (merged) */}
      {displayMaterials && displayMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Materials
              {batch.materialsOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayMaterials.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{m.name}</span>
                    {m.origin && <span className="text-sm text-muted-foreground">{m.origin}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{m.percentage}%</span>
                    {m.recyclable && (
                      <Badge variant="outline" className="text-success border-success">Recyclable</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications (merged) */}
      {displayCertifications && displayCertifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Certifications
              {batch.certificationsOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {displayCertifications.map((cert, i) => (
                <Badge key={i} variant="secondary">{cert.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this batch</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone. The product itself will not be affected.</p>
            </div>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Batch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
