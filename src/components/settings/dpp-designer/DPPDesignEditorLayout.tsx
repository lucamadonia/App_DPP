/**
 * Split-pane editor layout: Toolbar + Settings Panel (left) + Live Preview (right).
 */
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { DPPDesignSettings, DPPSectionId } from '@/types/database';
import type { Product } from '@/types/product';
import type { Viewport, ViewMode } from './DPPDesignToolbar';
import { DPPDesignToolbar } from './DPPDesignToolbar';
import { DPPDesignSettingsPanel } from './DPPDesignSettingsPanel';
import { DPPDesignPreviewPanel } from './DPPDesignPreviewPanel';

interface Props {
  // State
  designForm: DPPDesignSettings;
  viewMode: ViewMode;
  viewport: Viewport;
  product: Product;
  productLoading: boolean;
  primaryColor: string;
  isSaving: boolean;
  saved: boolean;
  isUploadingHero: boolean;
  heroInputRef: React.RefObject<HTMLInputElement | null>;

  // State setters
  setViewMode: (v: ViewMode) => void;
  setViewport: (v: Viewport) => void;

  // Update functions
  updateColors: (key: string, value: string) => void;
  updateTypography: (key: string, value: string) => void;
  updateHero: (key: string, value: unknown) => void;
  updateCards: (key: string, value: unknown) => void;
  updateFooter: (key: string, value: unknown) => void;
  updateCustomLayout: (key: string, value: unknown) => void;
  updateSocialLink: (key: string, value: string) => void;
  updateSectionConfig: (id: DPPSectionId, key: string, value: boolean) => void;
  applyPreset: (key: string) => void;
  moveSection: (index: number, direction: 'up' | 'down') => void;
  handleHeroUpload: (file: File) => void;
  handleSave: () => void;
}

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeToDesktopQuery(onChange: () => void): () => void {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * `lg` breakpoint check. The settings panel must mount exactly ONCE — it owns
 * `heroInputRef`, and two live <input> elements would race for the same ref —
 * so the desktop column and the mobile Sheet are JS branches, not CSS ones.
 * `useSyncExternalStore` keeps the very first render correct without an effect.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktopQuery,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

export function DPPDesignEditorLayout({
  designForm,
  viewMode,
  viewport,
  product,
  productLoading,
  primaryColor,
  isSaving,
  saved,
  isUploadingHero,
  heroInputRef,
  setViewMode,
  setViewport,
  updateColors,
  updateTypography,
  updateHero,
  updateCards,
  updateFooter,
  updateCustomLayout,
  updateSocialLink,
  updateSectionConfig,
  applyPreset,
  moveSection,
  handleHeroUpload,
  handleSave,
}: Props) {
  const { t } = useTranslation('settings');
  const isDesktop = useIsDesktop();
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const settingsPanel = (
    <DPPDesignSettingsPanel
      designForm={designForm}
      updateColors={updateColors}
      updateTypography={updateTypography}
      updateHero={updateHero}
      updateCards={updateCards}
      updateFooter={updateFooter}
      updateCustomLayout={updateCustomLayout}
      updateSocialLink={updateSocialLink}
      updateSectionConfig={updateSectionConfig}
      applyPreset={applyPreset}
      moveSection={moveSection}
      heroInputRef={heroInputRef}
      handleHeroUpload={handleHeroUpload}
      isUploadingHero={isUploadingHero}
      primaryColor={primaryColor}
    />
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Top Toolbar */}
      <DPPDesignToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewport={viewport}
        onViewportChange={setViewport}
        onSave={handleSave}
        isSaving={isSaving}
        saved={saved}
      />

      {/* Below lg the settings live in a Sheet — this bar opens it */}
      {!isDesktop && (
        <div className="flex items-center px-4 py-2 border-b bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileSettingsOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            {t('Design Settings')}
          </Button>
        </div>
      )}

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Settings — fixed column on lg+, Sheet below */}
        {isDesktop && (
          <div className="w-[420px] flex-shrink-0 border-r h-[calc(100dvh-53px)]">
            {settingsPanel}
          </div>
        )}

        {/* Right: Live Preview */}
        <div className="flex-1 overflow-hidden">
          <DPPDesignPreviewPanel
            viewport={viewport}
            viewMode={viewMode}
            designForm={designForm}
            product={product}
            loading={productLoading}
          />
        </div>
      </div>

      {/* Mobile / tablet settings sheet */}
      <Sheet
        open={!isDesktop && mobileSettingsOpen}
        onOpenChange={setMobileSettingsOpen}
      >
        <SheetContent
          side="left"
          className="w-[85vw] max-w-[420px] sm:max-w-[400px] p-0 flex flex-col gap-0"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-sm">{t('Design Settings')}</SheetTitle>
            <SheetDescription className="text-xs">
              {t('Adjust colors, typography and layout')}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0">{settingsPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
