import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Upload, Package, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { ImportProductsDialog } from '@/components/product/ImportProductsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** The DPP bulk entry point shares the validated product import and quota checks. */
export function BatchUploadPage() {
  const { t } = useTranslation('products');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  return (
    <PageContainer title={t('Batch Upload', { ns: 'common' })} description={t('Create multiple product passports from a CSV or JSON file.')}>
      <Card className="min-w-0">
        <CardContent className="space-y-6 p-5 sm:p-8">
          <FileSpreadsheet className="h-10 w-10 text-primary" aria-hidden />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t('Import Products')}</h2>
            <p className="max-w-2xl text-muted-foreground">{t('Download the template in the import wizard, map your columns and review every row before importing.')}</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {['Upload File', 'Column Mapping', 'Validation'].map((label, index) => (
              <li key={label} className="flex min-w-0 items-center gap-3 rounded-lg border p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>
                <span>{t(label)}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">{t('Existing products are preserved. New products count towards your plan limit.')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setOpen(true)}><Upload className="mr-2 h-4 w-4" />{t('Upload File')}</Button>
            <Button asChild variant="outline"><Link to="/products"><Package className="mr-2 h-4 w-4" />{t('Products', { ns: 'common' })}</Link></Button>
          </div>
          {completed && <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{t('Import finished. Your products are available in the product list.')}</p>}
        </CardContent>
      </Card>
      <ImportProductsDialog open={open} onOpenChange={setOpen} onImportComplete={() => {
        setCompleted(true);
        void queryClient.invalidateQueries();
      }} />
    </PageContainer>
  );
}
