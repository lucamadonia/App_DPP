import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IMPORTABLE_FIELDS,
  autoMapColumns,
  generateCSVTemplate,
} from '@/lib/product-csv';
import { importProducts } from '@/services/supabase/products';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'upload' | 'mapping' | 'validation' | 'import';

interface RowValidation {
  index: number;
  data: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  expanded?: boolean;
}

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportProductsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsDialogProps) {
  const { t } = useTranslation('products');
  const fileRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validations, setValidations] = useState<RowValidation[]>([]);
  const [skipErrors, setSkipErrors] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    errors: Array<{ index: number; name: string; error: string }>;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // -------------------------------------------------------------------------
  // Step 1: Upload
  // -------------------------------------------------------------------------

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setFileSize(0);
    setRawRows([]);
    setSourceHeaders([]);
    setColumnMapping({});
    setValidations([]);
    setImportProgress(0);
    setImportTotal(0);
    setImportResult(null);
    setIsImporting(false);
  };

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setFileSize(file.size);

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const rows: Record<string, string>[] = Array.isArray(json) ? json : [json];
          const headers = Object.keys(rows[0] || {});
          setRawRows(rows.map(r => {
            const out: Record<string, string> = {};
            for (const k of headers) out[k] = r[k] != null ? String(r[k]) : '';
            return out;
          }));
          setSourceHeaders(headers);
          setColumnMapping(autoMapColumns(headers));
          setStep('mapping');
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data as Record<string, string>[];
          const headers = result.meta.fields || [];
          setRawRows(rows);
          setSourceHeaders(headers);
          setColumnMapping(autoMapColumns(headers));
          setStep('mapping');
        },
        error: () => {
          alert('Failed to parse CSV file');
        },
      });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------------------
  // Step 2: Column mapping
  // -------------------------------------------------------------------------

  const mappedFields = new Set(Object.values(columnMapping));
  const requiredMissing = IMPORTABLE_FIELDS
    .filter((f) => f.required && !mappedFields.has(f.key))
    .map((f) => f.key);

  // -------------------------------------------------------------------------
  // Step 3: Validation
  // -------------------------------------------------------------------------

  const runValidation = async () => {
    // Fetch existing GTINs for duplicate check
    let existingGtins = new Set<string>();
    const gtinField = Object.entries(columnMapping).find(([, v]) => v === 'gtin');
    if (gtinField) {
      const { data } = await supabase.from('products').select('gtin');
      if (data) existingGtins = new Set(data.map((r) => r.gtin).filter(Boolean));
    }

    const results: RowValidation[] = rawRows.map((row, i) => {
      const issues: string[] = [];

      // Map row values
      const mapped: Record<string, string> = {};
      for (const [src, target] of Object.entries(columnMapping)) {
        if (target && target !== '_skip') mapped[target] = row[src] || '';
      }

      // Required checks
      for (const f of IMPORTABLE_FIELDS) {
        if (f.required && !mapped[f.key]?.trim()) {
          issues.push(t('Required field missing: {{field}}', { field: f.label }));
        }
      }

      // GTIN format
      if (mapped.gtin?.trim()) {
        const g = mapped.gtin.trim();
        if (!/^\d{8}$|^\d{12,14}$/.test(g)) {
          issues.push(t('Invalid GTIN format'));
        }
        if (existingGtins.has(g)) {
          issues.push(t('GTIN already exists'));
        }
      }

      // Numeric checks
      for (const key of ['netWeight', 'grossWeight']) {
        if (mapped[key]?.trim()) {
          const n = Number(mapped[key]);
          if (isNaN(n) || n <= 0) {
            issues.push(t('Must be a number') + `: ${key}`);
          }
        }
      }

      const hasError = issues.some(
        (iss) =>
          iss.includes(t('Required field missing: {{field}}', { field: '' }).replace('{{field}}', '').trim()) ||
          iss.includes(t('Invalid GTIN format')),
      );

      return {
        index: i,
        data: mapped,
        status: issues.length === 0 ? 'valid' : hasError ? 'error' : 'warning',
        issues,
      };
    });

    setValidations(results);
    setStep('validation');
  };

  const validCount = validations.filter((v) => v.status === 'valid').length;
  const warningCount = validations.filter((v) => v.status === 'warning').length;
  const errorCount = validations.filter((v) => v.status === 'error').length;

  // -------------------------------------------------------------------------
  // Step 4: Import
  // -------------------------------------------------------------------------

  const runImport = async () => {
    const rowsToImport = validations.filter(
      (v) => v.status === 'valid' || (v.status === 'warning' && !skipErrors) || v.status === 'warning',
    ).filter(v => !(skipErrors && v.status === 'error'));

    setImportTotal(rowsToImport.length);
    setImportProgress(0);
    setIsImporting(true);
    setStep('import');

    const products: Array<Partial<Product>> = rowsToImport.map((v) => {
      const d = v.data;
      return {
        name: d.name || '',
        manufacturer: d.manufacturer || '',
        category: d.category || '',
        gtin: d.gtin || '',
        description: d.description || '',
        hsCode: d.hsCode || undefined,
        countryOfOrigin: d.countryOfOrigin || undefined,
        netWeight: d.netWeight ? Number(d.netWeight) : undefined,
        grossWeight: d.grossWeight ? Number(d.grossWeight) : undefined,
        materials: d.materials ? tryParseJSON(d.materials) : [],
        certifications: d.certifications ? tryParseJSON(d.certifications) : [],
      };
    });

    // Import sequentially with progress updates
    const errors: Array<{ index: number; name: string; error: string }> = [];
    let imported = 0;
    for (let i = 0; i < products.length; i++) {
      const result = await importProducts([products[i]]);
      if (result.imported > 0) {
        imported++;
      } else if (result.errors.length > 0) {
        errors.push({
          index: i,
          name: products[i].name || `Row ${i + 1}`,
          error: result.errors[0].error,
        });
      }
      setImportProgress(i + 1);
    }

    setImportResult({ imported, failed: errors.length, errors });
    setIsImporting(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const STEPS: { key: Step; label: string }[] = [
    { key: 'upload', label: t('Upload File') },
    { key: 'mapping', label: t('Column Mapping') },
    { key: 'validation', label: t('Validation') },
    { key: 'import', label: t('Import') },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Import Products')}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i < stepIdx
                    ? 'bg-primary text-primary-foreground'
                    : i === stepIdx
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i === stepIdx ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('Drag a CSV or JSON file here, or click to select')}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                {t('Download Template')}
              </Button>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{fileName}</span>
                <span>{(fileSize / 1024).toFixed(1)} KB</span>
                <Badge variant="secondary">
                  {t('{{count}} rows detected', { count: rawRows.length })}
                </Badge>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">{t('Source Column')}</th>
                      <th className="text-left p-2 font-medium">{t('Preview')}</th>
                      <th className="text-left p-2 font-medium">{t('Target Field')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceHeaders.map((header) => {
                      const mapped = columnMapping[header];
                      const isRequired = IMPORTABLE_FIELDS.find(
                        (f) => f.key === mapped,
                      )?.required;
                      return (
                        <tr key={header} className="border-b">
                          <td className="p-2 font-mono text-xs">{header}</td>
                          <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                            {rawRows
                              .slice(0, 2)
                              .map((r) => r[header])
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </td>
                          <td className="p-2">
                            <Select
                              value={mapped || '_skip'}
                              onValueChange={(v) =>
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [header]: v === '_skip' ? '' : v,
                                }))
                              }
                            >
                              <SelectTrigger
                                className={`h-8 text-xs ${
                                  mapped && isRequired
                                    ? 'border-green-300'
                                    : mapped
                                    ? 'border-green-200'
                                    : 'border-yellow-200'
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_skip">
                                  {t('Skip')}
                                </SelectItem>
                                {IMPORTABLE_FIELDS.map((f) => (
                                  <SelectItem key={f.key} value={f.key}>
                                    {f.label}
                                    {f.required ? ' *' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {mapped && (
                              <span className="text-[10px] text-green-600 ml-1">
                                {t('Auto-detected')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {requiredMissing.length > 0 && (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t('Required field missing: {{field}}', {
                    field: requiredMissing
                      .map((k) => IMPORTABLE_FIELDS.find((f) => f.key === k)?.label)
                      .join(', '),
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Validation */}
          {step === 'validation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {validCount} {t('valid', { ns: 'common' }).toLowerCase?.() || 'valid'}
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {warningCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    {errorCount}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="skip-errors"
                  checked={skipErrors}
                  onCheckedChange={(v) => setSkipErrors(!!v)}
                />
                <Label htmlFor="skip-errors" className="text-sm">
                  {t('Skip rows with errors')}
                </Label>
              </div>

              <div className="border rounded-md overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 w-8">#</th>
                      <th className="text-left p-2">{t('Product Name')}</th>
                      <th className="text-left p-2 w-24">{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validations.map((v) => (
                      <tr
                        key={v.index}
                        className={`border-b cursor-pointer hover:bg-muted/30 ${
                          v.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''
                        }`}
                        onClick={() =>
                          setValidations((prev) =>
                            prev.map((vv) =>
                              vv.index === v.index
                                ? { ...vv, expanded: !vv.expanded }
                                : vv,
                            ),
                          )
                        }
                      >
                        <td className="p-2 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {v.issues.length > 0 ? (
                              v.expanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )
                            ) : null}
                            {v.index + 1}
                          </div>
                          {v.expanded && v.issues.length > 0 && (
                            <ul className="mt-1 space-y-0.5 ml-4">
                              {v.issues.map((iss, ii) => (
                                <li
                                  key={ii}
                                  className="text-xs text-destructive"
                                >
                                  {iss}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="p-2">
                          {v.data.name || '-'}
                          {v.expanded && v.issues.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {v.issues.map((iss, ii) => (
                                <li
                                  key={ii}
                                  className="text-xs text-destructive"
                                >
                                  {iss}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="p-2">
                          {v.status === 'valid' && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              OK
                            </Badge>
                          )}
                          {v.status === 'warning' && (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-100 text-yellow-800 text-xs"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Warn
                            </Badge>
                          )}
                          {v.status === 'error' && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Import */}
          {step === 'import' && (
            <div className="space-y-6 py-4">
              {isImporting ? (
                <div className="space-y-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t('Importing {{done}} of {{total}}...', {
                      done: importProgress,
                      total: importTotal,
                    })}
                  </p>
                  <Progress
                    value={importTotal > 0 ? (importProgress / importTotal) * 100 : 0}
                  />
                </div>
              ) : importResult ? (
                <div className="space-y-4 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                  <h3 className="text-lg font-semibold">{t('Import Complete')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('{{imported}} imported, {{failed}} failed', {
                      imported: importResult.imported,
                      failed: importResult.failed,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('All products imported as draft')}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="border rounded-md p-3 text-left max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive">
                          {err.name}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                {t('Back')}
              </Button>
              <Button
                onClick={runValidation}
                disabled={requiredMissing.length > 0}
              >
                {t('Next')}
              </Button>
            </>
          )}

          {step === 'validation' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                {t('Back')}
              </Button>
              <Button
                onClick={runImport}
                disabled={validCount === 0 && (skipErrors || warningCount === 0)}
              >
                {t('Start Import')}
              </Button>
            </>
          )}

          {step === 'import' && !isImporting && importResult && (
            <Button
              onClick={() => {
                resetState();
                onOpenChange(false);
                onImportComplete();
              }}
            >
              {t('Done')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryParseJSON(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}
