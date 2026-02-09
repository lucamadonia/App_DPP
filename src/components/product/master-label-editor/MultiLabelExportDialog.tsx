import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, FileText, Files, AlertTriangle, Info } from 'lucide-react';
import type {
  MultiLabelExportConfig,
  PackageCounterFormat
} from '@/types/master-label-editor';

interface MultiLabelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: MultiLabelExportConfig) => Promise<void>;
  hasCounterElement: boolean;
}

export function MultiLabelExportDialog({
  open,
  onOpenChange,
  onExport,
  hasCounterElement,
}: MultiLabelExportDialogProps) {
  const { t } = useTranslation('products');

  const [config, setConfig] = useState<MultiLabelExportConfig>({
    labelCount: 6,
    format: 'package-x-of-y',
    startNumber: 1,
    filenamePattern: 'single',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Validation
  useEffect(() => {
    const newErrors: string[] = [];
    const newWarnings: string[] = [];

    if (config.labelCount < 1) {
      newErrors.push(t('ml.export.validation.minCount'));
    }
    if (config.labelCount > 999) {
      newErrors.push(t('ml.export.validation.maxCount'));
    }
    if (config.startNumber < 1) {
      newErrors.push(t('ml.export.validation.minStart'));
    }
    if (config.labelCount > 1 && !hasCounterElement) {
      newWarnings.push(t('ml.export.validation.noCounterElement'));
    }
    if (config.labelCount > 50 && config.filenamePattern === 'batch') {
      newWarnings.push(t('ml.export.validation.manyFiles'));
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
  }, [config, hasCounterElement, t]);

  const handleExport = async () => {
    if (errors.length > 0) return;

    setIsExporting(true);
    try {
      await onExport(config);
      onOpenChange(false);
    } catch (err) {
      console.error('Export failed:', err);
      // Error is already shown via toast in parent component
      // Don't close dialog on error so user can try again or adjust settings
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('ml.export.title')}
          </DialogTitle>
          <DialogDescription>
            {t('ml.export.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label Count */}
          <div className="space-y-2">
            <Label htmlFor="labelCount">{t('ml.export.labelCount')}</Label>
            <Input
              id="labelCount"
              type="number"
              min={1}
              max={999}
              value={config.labelCount}
              onChange={(e) => setConfig({ ...config, labelCount: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-muted-foreground">
              {t('ml.export.labelCountHint')}
            </p>
          </div>

          {/* Counter Format */}
          {config.labelCount > 1 && (
            <div className="space-y-2">
              <Label>{t('ml.export.counterFormat')}</Label>
              <Select
                value={config.format}
                onValueChange={(v) => setConfig({ ...config, format: v as PackageCounterFormat })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x-of-y">1 {t('ml.export.format.of')} 5</SelectItem>
                  <SelectItem value="x-slash-y">1/5</SelectItem>
                  <SelectItem value="package-x-of-y">
                    {t('ml.export.format.package')} 1 {t('ml.export.format.of')} 5
                  </SelectItem>
                  <SelectItem value="box-x-of-y">
                    {t('ml.export.format.box')} 1 {t('ml.export.format.of')} 5
                  </SelectItem>
                  <SelectItem value="parcel-x-of-y">
                    {t('ml.export.format.parcel')} 1 {t('ml.export.format.of')} 5
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Number */}
          {config.labelCount > 1 && (
            <div className="space-y-2">
              <Label htmlFor="startNumber">{t('ml.export.startNumber')}</Label>
              <Input
                id="startNumber"
                type="number"
                min={1}
                value={config.startNumber}
                onChange={(e) => setConfig({ ...config, startNumber: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}

          {/* Filename Pattern */}
          {config.labelCount > 1 && (
            <div className="space-y-2">
              <Label>{t('ml.export.filenamePattern')}</Label>
              <RadioGroup
                value={config.filenamePattern}
                onValueChange={(v) => setConfig({ ...config, filenamePattern: v as 'single' | 'batch' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('ml.export.singleFile')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="batch" id="batch" />
                  <Label htmlFor="batch" className="font-normal cursor-pointer flex items-center gap-2">
                    <Files className="h-4 w-4" />
                    {t('ml.export.separateFiles')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleExport}
            disabled={errors.length > 0 || isExporting}
          >
            {isExporting ? t('ml.export.exporting') : t('ml.export.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
