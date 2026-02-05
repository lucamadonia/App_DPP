/**
 * Header Toolbar Component
 *
 * Glassmorphic sticky header with search, presets, changes badge, and save button.
 */

import { useState } from 'react';
import { ArrowLeft, Save, Loader2, Search, Menu, BarChart3 } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  isMobile?: boolean;
  onOpenLeftSheet?: () => void;
  onOpenRightSheet?: () => void;
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
  isMobile = false,
  onOpenLeftSheet,
  onOpenRightSheet,
}: HeaderToolbarProps) {
  const { t } = useTranslation('dpp');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 gap-2">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            {!isMobile && <span className="ml-2">{t('Back')}</span>}
          </Button>

          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-semibold truncate">
              {t('Visibility Settings')}
            </h1>
            {!isMobile && (
              <p className="text-xs text-muted-foreground hidden md:block">
                {t('Configure field visibility independently')}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile: Sheet Triggers */}
          {isMobile && (
            <>
              <Button variant="outline" size="sm" onClick={onOpenLeftSheet}>
                <Menu className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenRightSheet}>
                <BarChart3 className="h-4 w-4" />
                {hasChanges && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {changeCount}
                  </Badge>
                )}
              </Button>
            </>
          )}

          {/* Search: Modal on Mobile, Inline on Desktop */}
          {isMobile ? (
            <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle>{t('Search fields')}</SheetTitle>
                </SheetHeader>
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('Search fields...')}
                  className="w-full"
                  autoFocus
                />
              </SheetContent>
            </Sheet>
          ) : (
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
          )}

          {/* Desktop: Presets + Save */}
          {!isMobile && (
            <>
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

              {hasChanges && (
                <Badge variant="outline" className="gap-1">
                  <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  {changeCount} {t('changes')}
                </Badge>
              )}

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
