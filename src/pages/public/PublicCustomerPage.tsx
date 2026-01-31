import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePublicProduct } from '@/hooks/use-public-product';
import { TemplateModern } from '@/components/public/TemplateModern';
import { TemplateClassic } from '@/components/public/TemplateClassic';
import { TemplateCompact } from '@/components/public/TemplateCompact';
import { TemplateMinimal } from '@/components/public/TemplateMinimal';
import { TemplateTechnical } from '@/components/public/TemplateTechnical';
import { TemplateEcoFriendly } from '@/components/public/TemplateEcoFriendly';
import { TemplatePremium } from '@/components/public/TemplatePremium';
import { TemplateGovernment } from '@/components/public/TemplateGovernment';
import { TemplateRetail } from '@/components/public/TemplateRetail';
import { TemplateScientific } from '@/components/public/TemplateScientific';
import { TemplateAccessible } from '@/components/public/TemplateAccessible';

export function PublicCustomerPage() {
  const { t } = useTranslation('dpp');
  const { gtin, serial } = useParams();
  const { product, visibilityV2, dppTemplateCustomer, dppDesign, loading } = usePublicProduct(gtin, serial);

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

  const templateProps = { product, visibilityV2, view: 'consumer' as const, dppDesign };

  switch (dppTemplateCustomer) {
    case 'classic':
      return <TemplateClassic {...templateProps} />;
    case 'compact':
      return <TemplateCompact {...templateProps} />;
    case 'minimal':
      return <TemplateMinimal {...templateProps} />;
    case 'technical':
      return <TemplateTechnical {...templateProps} />;
    case 'eco-friendly':
      return <TemplateEcoFriendly {...templateProps} />;
    case 'premium':
      return <TemplatePremium {...templateProps} />;
    case 'government':
      return <TemplateGovernment {...templateProps} />;
    case 'retail':
      return <TemplateRetail {...templateProps} />;
    case 'scientific':
      return <TemplateScientific {...templateProps} />;
    case 'accessible':
      return <TemplateAccessible {...templateProps} />;
    case 'modern':
    default:
      return <TemplateModern {...templateProps} />;
  }
}
