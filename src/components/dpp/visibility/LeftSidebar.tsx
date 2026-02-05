/**
 * Left Sidebar Component
 *
 * Quick presets and bulk actions.
 */

import { Globe, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeftSidebarProps {
  onPresetApply: (presetId: string) => void;
  onBulkAction: (level: 'consumer' | 'customs', value: boolean) => void;
}

export function LeftSidebar({ onPresetApply, onBulkAction }: LeftSidebarProps) {
  const { t } = useTranslation('dpp');

  return (
    <div className="w-[220px] border-r bg-muted/10 p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('Quick Presets')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-9"
            onClick={() => onPresetApply('all-public')}
          >
            <Globe className="h-4 w-4 mr-2" />
            {t('All Public')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-9"
            onClick={() => onPresetApply('minimal-consumer')}
          >
            <EyeOff className="h-4 w-4 mr-2" />
            {t('Minimal Consumer')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-9"
            onClick={() => onPresetApply('full-customs')}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {t('Full Customs')}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-xs h-9"
            onClick={() => onPresetApply('factory-defaults')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('Factory Defaults')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('Bulk Actions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => onBulkAction('consumer', true)}
          >
            {t('All Consumer → ON')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => onBulkAction('consumer', false)}
          >
            {t('All Consumer → OFF')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => onBulkAction('customs', true)}
          >
            {t('All Customs → ON')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => onBulkAction('customs', false)}
          >
            {t('All Customs → OFF')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
