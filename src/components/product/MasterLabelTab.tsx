import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  Paintbrush,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranding } from '@/hooks/use-branding';
import { getSupplier, getCountries } from '@/services/supabase';
import type { Product } from '@/types/product';
import type { BatchListItem } from '@/types/product';
import type { Supplier, Country } from '@/types/database';
import type { SupplierProduct } from '@/types/database';
import type { MasterLabelData, LabelVariant, LabelValidationResult } from '@/types/master-label';
import { detectProductGroup, assembleMasterLabelData, generateQRDataUrl, buildDppUrl } from '@/lib/master-label-assembler';
import { validateMasterLabel } from '@/lib/master-label-validation';
import { MasterLabelPreview } from './MasterLabelPreview';

const MasterLabelEditorPage = lazy(() =>
  import('./master-label-editor/MasterLabelEditorPage').then(m => ({ default: m.MasterLabelEditorPage }))
);

interface MasterLabelTabProps {
  product: Product;
  batches: BatchListItem[];
  productSuppliers: Array<SupplierProduct & { supplier_name: string; supplier_country: string }>;
}

export function MasterLabelTab({ product, batches, productSuppliers }: MasterLabelTabProps) {
  const { t } = useTranslation('products');
  const { qrCodeSettings } = useBranding();
  const [searchParams] = useSearchParams();

  // Mode: simple vs advanced editor
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  // Config state
  const preselectedBatchId = searchParams.get('batchId') || '';
  const [variant, setVariant] = useState<LabelVariant>('b2b');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preselectedBatchId);
  const [targetCountry, setTargetCountry] = useState<string>('');

  // Data state
  const [labelData, setLabelData] = useState<MasterLabelData | null>(null);
  const [validation, setValidation] = useState<LabelValidationResult[]>([]);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // Supplier state
  const [manufacturerSupplier, setManufacturerSupplier] = useState<Supplier | null>(null);
  const [importerSupplier, setImporterSupplier] = useState<Supplier | null>(null);

  // Supplier override state (for advanced editor)
  const [manufacturerOverrideId, setManufacturerOverrideId] = useState<string | null>(null);
  const [importerOverrideId, setImporterOverrideId] = useState<string | null>(null);

  const productGroup = detectProductGroup(product.category);
  const liveBatches = batches.filter(b => b.status === 'live' || b.status === 'draft');

  // Load countries for target country dropdown
  useEffect(() => {
    getCountries().then(setCountries).catch(console.error);
  }, []);


  // Load override suppliers when override IDs change
  useEffect(() => {
    if (manufacturerOverrideId) {
      getSupplier(manufacturerOverrideId).then(setManufacturerSupplier).catch(console.error);
    } else if (product.manufacturerSupplierId) {
      getSupplier(product.manufacturerSupplierId).then(setManufacturerSupplier).catch(console.error);
    } else {
      const mfr = productSuppliers.find(sp => sp.role === 'manufacturer');
      if (mfr) {
        getSupplier(mfr.supplier_id).then(setManufacturerSupplier).catch(console.error);
      } else {
        setManufacturerSupplier(null);
      }
    }
  }, [manufacturerOverrideId, product.manufacturerSupplierId, productSuppliers]);

  useEffect(() => {
    if (importerOverrideId) {
      getSupplier(importerOverrideId).then(setImporterSupplier).catch(console.error);
    } else if (product.importerSupplierId) {
      getSupplier(product.importerSupplierId).then(setImporterSupplier).catch(console.error);
    } else {
      const imp = productSuppliers.find(sp => sp.role === 'importeur');
      if (imp) {
        getSupplier(imp.supplier_id).then(setImporterSupplier).catch(console.error);
      } else {
        setImporterSupplier(null);
      }
    }
  }, [importerOverrideId, product.importerSupplierId, productSuppliers]);

  // Assemble label data when config changes
  const assembleLabel = useCallback(async () => {
    setIsAssembling(true);

    const selectedBatch = liveBatches.find(b => b.id === selectedBatchId);
    const serialNumber = selectedBatch?.serialNumber || product.serialNumber || '';
    const batchNumber = selectedBatch?.batchNumber || product.batchNumber || '';

    const dppUrl = buildDppUrl(product.gtin, serialNumber, {
      resolverFormat: qrCodeSettings.resolver,
      customBaseUrl: qrCodeSettings.customDomain
        ? `${qrCodeSettings.useHttps ? 'https' : 'http'}://${qrCodeSettings.customDomain}`
        : undefined,
    });

    let qrDataUrl = '';
    try {
      qrDataUrl = await generateQRDataUrl(dppUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    }

    const data = assembleMasterLabelData({
      product: {
        name: product.name,
        gtin: product.gtin,
        batchNumber: product.batchNumber,
        serialNumber: product.serialNumber,
        category: product.category,
        manufacturer: product.manufacturer,
        manufacturerAddress: product.manufacturerAddress,
        manufacturerEORI: (product as any).manufacturerEORI || '',
        manufacturerVAT: (product as any).manufacturerVAT || '',
        materials: product.materials || [],
        certifications: product.certifications || [],
        recyclability: product.recyclability,
        registrations: product.registrations as Record<string, string> | undefined,
        netWeight: product.netWeight,
        grossWeight: product.grossWeight,
        hsCode: product.hsCode,
        countryOfOrigin: product.countryOfOrigin,
        manufacturerSupplierId: product.manufacturerSupplierId,
        importerSupplierId: product.importerSupplierId,
      },
      batch: selectedBatch ? {
        batchNumber,
        serialNumber: selectedBatch.serialNumber,
        quantity: selectedBatch.quantity,
      } : undefined,
      manufacturerSupplier,
      importerSupplier,
      variant,
      targetCountry,
      dppUrl,
      qrDataUrl,
    });

    setLabelData(data);
    setValidation(validateMasterLabel(data));
    setIsAssembling(false);
  }, [selectedBatchId, variant, targetCountry, product, liveBatches, manufacturerSupplier, importerSupplier, qrCodeSettings]);

  useEffect(() => {
    assembleLabel();
  }, [assembleLabel]);

  // Generate PDF via dynamic import
  const handleGeneratePDF = async () => {
    if (!labelData) return;
    setIsGenerating(true);
    try {
      const { generateMasterLabelPDF } = await import('./MasterLabelPDF');
      await generateMasterLabelPDF(labelData);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const errors = validation.filter(v => v.severity === 'error');
  const warnings = validation.filter(v => v.severity === 'warning');
  const infos = validation.filter(v => v.severity === 'info');

  // Advanced Editor mode
  if (mode === 'advanced') {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('simple')}
            >
              {t('ml.editor.backToSimple')}
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
            <MasterLabelEditorPage
              data={labelData}
              batches={batches}
              variant={variant}
              onVariantChange={setVariant}
              selectedBatchId={selectedBatchId}
              onBatchChange={setSelectedBatchId}
              onBack={() => setMode('simple')}
              productSuppliers={productSuppliers}
              manufacturerOverrideId={manufacturerOverrideId}
              onManufacturerOverride={setManufacturerOverrideId}
              importerOverrideId={importerOverrideId}
              onImporterOverride={setImporterOverrideId}
            />
          </div>
        </div>
      </Suspense>
    );
  }

  // Simple Mode (original)
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode('advanced')}
          className="gap-1.5"
        >
          <Paintbrush className="h-4 w-4" />
          {t('ml.editor.advancedEditor')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Product Group Badge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {t('ml.title')}
              </CardTitle>
              <CardDescription>{t('ml.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('ml.detectedGroup')}</span>
                <Badge variant="secondary">{t(`ml.group.${productGroup}`)}</Badge>
              </div>

              {/* Variant Toggle */}
              <div className="space-y-2">
                <Label>{t('ml.variant')}</Label>
                <Select value={variant} onValueChange={(v) => setVariant(v as LabelVariant)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2b">{t('ml.variantB2B')}</SelectItem>
                    <SelectItem value="b2c">{t('ml.variantB2C')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Selector */}
              <div className="space-y-2">
                <Label>{t('ml.selectBatch')}</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('ml.selectBatchPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {liveBatches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.serialNumber}
                        {batch.batchNumber ? ` (${batch.batchNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Country (B2C only) */}
              {variant === 'b2c' && (
                <div className="space-y-2">
                  <Label>{t('ml.targetCountry')}</Label>
                  <Select value={targetCountry} onValueChange={setTargetCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('ml.selectCountry')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validation.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('ml.validation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {errors.map((v, i) => (
                  <div key={`e-${i}`} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span className="text-destructive">{t(v.i18nKey)}</span>
                  </div>
                ))}
                {warnings.map((v, i) => (
                  <div key={`w-${i}`} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <span className="text-warning">{t(v.i18nKey)}</span>
                  </div>
                ))}
                {infos.map((v, i) => (
                  <div key={`i-${i}`} className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{t(v.i18nKey)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || isAssembling || !labelData}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('ml.generating')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('ml.generatePDF')}
              </>
            )}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">{t('ml.preview')}</p>
          {isAssembling ? (
            <div className="w-[280px] h-[396px] bg-muted/50 rounded-lg border flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MasterLabelPreview data={labelData} />
          )}
          <p className="text-xs text-muted-foreground">{t('ml.previewNote')}</p>
        </div>
      </div>
    </div>
  );
}
