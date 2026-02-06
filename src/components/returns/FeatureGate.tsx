import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: string;
  available: boolean;
  children: React.ReactNode;
}

export function FeatureGate({ feature, available, children }: FeatureGateProps) {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();

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
        <Button variant="outline" onClick={() => navigate('/settings/billing')}>
          {t('Upgrade')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
