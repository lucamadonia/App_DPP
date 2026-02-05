/**
 * Header Toolbar Component
 *
 * Glassmorphic sticky header with search, presets, changes badge, and save button.
 */

import { ArrowLeft, Save, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface HeaderToolbarProps {
  hasChanges: boolean;
  changeCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSave: () => void;
  onBack: () => void;
  onPresetApply: (presetId: string) => void;
  isSaving: boolean;
}

export function HeaderToolbar({
  hasChanges,
  changeCount,
  searchQuery,
  onSearchChange,
  onSave,
  onBack,
  onPresetApply,
  isSaving,
}: HeaderToolbarProps) {
  const { t } = useTranslation('dpp');

  return (
    <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('Back')}
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t('Visibility Settings')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('Configure field visibility independently for consumers and customs')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('Search fields...')}
              className="pl-9 pr-16"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          {/* Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('Presets')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => onPresetApply('all-public')}>
                {t('All Public')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPresetApply('minimal-consumer')}>
                {t('Minimal Consumer')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPresetApply('full-customs')}>
                {t('Full Customs')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPresetApply('factory-defaults')}>
                {t('Factory Defaults')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Changes Badge */}
          {hasChanges && (
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              {changeCount} {t('changes')}
            </Badge>
          )}

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              hasChanges && 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
