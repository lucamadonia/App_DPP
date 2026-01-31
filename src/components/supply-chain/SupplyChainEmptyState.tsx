import { useTranslation } from 'react-i18next';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupplyChainEmptyStateProps {
  onCreateFirst: () => void;
}

export function SupplyChainEmptyState({ onCreateFirst }: SupplyChainEmptyStateProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
          <Package className="h-12 w-12 text-muted-foreground/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
          <Plus className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('No supply chain entries yet')}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        {t('Start tracking your product supply chain by adding the first entry. Document each step from raw materials to final delivery.')}
      </p>

      {/* Action */}
      <Button onClick={onCreateFirst} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        {t('Add First Entry')}
      </Button>
    </div>
  );
}
