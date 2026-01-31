import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: string;
  available: boolean;
  children: React.ReactNode;
}

export function FeatureGate({ feature, available, children }: FeatureGateProps) {
  const { t } = useTranslation('returns');

  if (available) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">{feature}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('This feature is not included in your current plan.')}
        </p>
        <Button variant="outline">
          {t('Upgrade')}
        </Button>
      </CardContent>
    </Card>
  );
}
