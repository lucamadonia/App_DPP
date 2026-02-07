import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SupplierDataSubmittedPage() {
  const { t } = useTranslation('supplier-data-portal');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">{t('Data Submitted Successfully')}</h2>
          <p className="text-muted-foreground">{t('Thank you for providing the requested data')}</p>
          <p className="text-sm text-muted-foreground">
            {t('The data has been submitted and the requester will be notified')}
          </p>
          <p className="text-sm text-muted-foreground pt-4">
            {t('You can close this page now')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
