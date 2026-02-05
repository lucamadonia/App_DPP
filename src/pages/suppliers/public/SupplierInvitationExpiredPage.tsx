/**
 * Supplier Invitation Expired Page
 * Displayed when invitation is expired, cancelled, or invalid
 */

import { useTranslation } from 'react-i18next';
import { AlertCircle, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SupplierInvitationExpiredPage() {
  const { t } = useTranslation('supplier-portal');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-10 pb-8 text-center">
            {/* Warning icon */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-10 w-10 text-orange-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold mb-2">
              {t('Invitation Expired or Invalid')}
            </h2>

            <p className="text-muted-foreground mb-6">
              {t('This supplier registration invitation has expired, been cancelled, or is no longer valid.')}
            </p>

            {/* Info box */}
            <div className="text-left bg-muted/50 rounded-xl p-5 space-y-3 mb-6">
              <p className="font-semibold text-sm">{t('What can you do?')}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t('Contact the company that invited you for a new invitation link')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t('Check if you received a more recent invitation email')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t('Verify that you clicked on the correct registration link')}</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              {t('If you believe this is an error, please contact the company directly.')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
