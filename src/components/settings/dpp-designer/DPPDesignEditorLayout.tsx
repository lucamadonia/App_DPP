/**
 * Split-pane editor layout: Toolbar + Settings Panel (left) + Live Preview (right).
 */
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
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Settings */}
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
    </div>
  );
}
