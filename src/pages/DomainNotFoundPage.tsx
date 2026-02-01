import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function DomainNotFoundPage() {
  const { t } = useTranslation('returns');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('Domain not found')}
        </h1>
        <p className="text-muted-foreground">
          {t('This domain is not configured for any portal.')}
        </p>
        <p className="text-sm text-muted-foreground mt-4 font-mono">
          {window.location.hostname}
        </p>
      </div>
    </div>
  );
}
