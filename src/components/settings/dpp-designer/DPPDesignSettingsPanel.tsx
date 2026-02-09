/**
 * Left settings panel with accordion groups for all 36+ custom layout settings.
 */
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  Type,
  Minus,
  Columns2,
  PanelLeft,
  Upload,
  Loader2,
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  HelpCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type {
  DPPDesignSettings,
  DPPSectionId,
  DPPFontFamily,
  DPPFontSize,
  DPPFontWeight,
  DPPBorderRadius,
  DPPShadowDepth,
  DPPBorderStyle,
  DPPTemplateName,
} from '@/types/database';
import {
  DPP_THEME_PRESETS,
  BORDER_RADIUS_MAP,
  SHADOW_MAP,
  FONT_FAMILY_MAP,
  FONT_WEIGHT_MAP,
} from '@/lib/dpp-design-defaults';
import { resolveDesign } from '@/lib/dpp-design-utils';
import { DPPDisplayModeSelector } from './DPPDisplayModeSelector';

interface Props {
  designForm: DPPDesignSettings;
  templateCustomer: DPPTemplateName;
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
  heroInputRef: React.RefObject<HTMLInputElement | null>;
  handleHeroUpload: (file: File) => void;
  isUploadingHero: boolean;
  primaryColor: string;
}

const SECTION_LABELS: Record<DPPSectionId, { icon: ReactNode; labelKey: string }> = {
  materials: { icon: <Package className="h-4 w-4" />, labelKey: 'Materials' },
  packaging: { icon: <Package className="h-4 w-4" />, labelKey: 'Packaging' },
  carbonFootprint: { icon: <Leaf className="h-4 w-4" />, labelKey: 'Carbon Footprint' },
  recycling: { icon: <Recycle className="h-4 w-4" />, labelKey: 'Recycling' },
  certifications: { icon: <Award className="h-4 w-4" />, labelKey: 'Certifications' },
  supplyChain: { icon: <Truck className="h-4 w-4" />, labelKey: 'Supply Chain' },
  support: { icon: <HelpCircle className="h-4 w-4" />, labelKey: 'Support' },
  components: { icon: <Package className="h-4 w-4" />, labelKey: 'Components' },
};

export function DPPDesignSettingsPanel({
  designForm,
  templateCustomer,
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
  heroInputRef,
  handleHeroUpload,
  isUploadingHero,
  primaryColor,
}: Props) {
  const { t } = useTranslation('settings');
  const resolved = resolveDesign(designForm);
  const cl = resolved.customLayout;

  return (
    <div className="w-[420px] flex-shrink-0 border-r overflow-y-auto h-[calc(100vh-53px)]">
      <Accordion type="multiple" defaultValue={['layout', 'content']} className="divide-y">

        {/* === LAYOUT & STRUCTURE === */}
        <AccordionItem value="layout">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Layout & Structure')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Layout Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Layout Mode')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.layoutMode}
                onChange={(v) => updateCustomLayout('layoutMode', v)}
                options={[
                  { value: 'single-column', label: t('Single Column'), icon: <AlignLeft className="h-5 w-5" /> },
                  { value: 'two-column', label: t('Two Columns'), icon: <Columns2 className="h-5 w-5" /> },
                  { value: 'sidebar', label: t('Sidebar'), icon: <PanelLeft className="h-5 w-5" /> },
                ]}
              />
            </div>

            {/* Section Style */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Section Style')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.sectionStyle}
                onChange={(v) => updateCustomLayout('sectionStyle', v)}
                options={[
                  { value: 'card', label: t('Cards'), description: t('Styled cards with shadow') },
                  { value: 'flat', label: t('Flat'), description: t('Headings and dividers') },
                  { value: 'accordion', label: t('Accordion'), description: t('Collapsible sections') },
                ]}
              />
            </div>

            {/* Header Style */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Header Style')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.headerStyle}
                onChange={(v) => updateCustomLayout('headerStyle', v)}
                options={[
                  { value: 'icon-left', label: t('Icon Left'), icon: <AlignLeft className="h-4 w-4" /> },
                  { value: 'simple', label: t('Simple'), icon: <Type className="h-4 w-4" /> },
                  { value: 'centered', label: t('Centered'), icon: <AlignCenter className="h-4 w-4" /> },
                  { value: 'underlined', label: t('Underlined'), icon: <Minus className="h-4 w-4" /> },
                ]}
              />
            </div>

            {/* Spacing */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Section Spacing')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.sectionSpacing}
                onChange={(v) => updateCustomLayout('sectionSpacing', v)}
                options={[
                  { value: 'tight', label: t('Tight') },
                  { value: 'normal', label: t('Normal') },
                  { value: 'relaxed', label: t('Relaxed') },
                  { value: 'spacious', label: t('Spacious') },
                ]}
              />
            </div>

            {/* Content Width */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Content Width')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.contentWidth}
                onChange={(v) => updateCustomLayout('contentWidth', v)}
                options={[
                  { value: 'narrow', label: t('Narrow'), description: '640px' },
                  { value: 'medium', label: t('Medium'), description: '768px' },
                  { value: 'wide', label: t('Wide'), description: '1024px' },
                  { value: 'full', label: t('Full'), description: '100%' },
                ]}
              />
            </div>

            {/* Inner Padding */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Section Inner Padding')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.sectionInnerPadding}
                onChange={(v) => updateCustomLayout('sectionInnerPadding', v)}
                options={[
                  { value: 'tight', label: t('Tight') },
                  { value: 'normal', label: t('Normal') },
                  { value: 'relaxed', label: t('Relaxed') },
                  { value: 'spacious', label: t('Spacious') },
                ]}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Show Section Dividers')}</Label>
                <Switch checked={cl.showSectionDividers} onCheckedChange={(v) => updateCustomLayout('showSectionDividers', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Compact Mode')}</Label>
                <Switch checked={cl.compactMode} onCheckedChange={(v) => updateCustomLayout('compactMode', v)} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === CONTENT DISPLAY MODES === */}
        <AccordionItem value="content">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Content Display')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Materials Display')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.materialsDisplayMode}
                onChange={(v) => updateCustomLayout('materialsDisplayMode', v)}
                options={[
                  { value: 'table', label: t('Table') },
                  { value: 'cards', label: t('Cards') },
                  { value: 'horizontal-bars', label: t('Bars') },
                  { value: 'donut-chart', label: t('Donut') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Carbon Footprint Display')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.carbonDisplayMode}
                onChange={(v) => updateCustomLayout('carbonDisplayMode', v)}
                options={[
                  { value: 'gauge', label: t('Gauge') },
                  { value: 'stat-cards', label: t('Stat Cards') },
                  { value: 'comparison-bar', label: t('Bar') },
                  { value: 'infographic', label: t('Infographic') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Certifications Display')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.certificationsDisplayMode}
                onChange={(v) => updateCustomLayout('certificationsDisplayMode', v)}
                options={[
                  { value: 'list', label: t('List') },
                  { value: 'grid-cards', label: t('Grid') },
                  { value: 'badge-row', label: t('Badges') },
                  { value: 'timeline', label: t('Timeline') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Supply Chain Display')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.supplyChainDisplayMode}
                onChange={(v) => updateCustomLayout('supplyChainDisplayMode', v)}
                options={[
                  { value: 'numbered-list', label: t('List') },
                  { value: 'vertical-timeline', label: t('V-Timeline') },
                  { value: 'horizontal-timeline', label: t('H-Timeline') },
                  { value: 'map-cards', label: t('Cards') },
                  { value: 'table', label: t('Table') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Recycling Display')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.recyclingDisplayMode}
                onChange={(v) => updateCustomLayout('recyclingDisplayMode', v)}
                options={[
                  { value: 'progress-bar', label: t('Progress') },
                  { value: 'donut', label: t('Donut') },
                  { value: 'info-cards', label: t('Info Cards') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Support Display')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.supportDisplayMode}
                onChange={(v) => updateCustomLayout('supportDisplayMode', v)}
                options={[
                  { value: 'stacked', label: t('Stacked') },
                  { value: 'tabbed', label: t('Tabbed') },
                  { value: 'accordion', label: t('Accordion') },
                ]}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs">{t('Show Data Labels')}</Label>
              <Switch checked={cl.showDataLabels} onCheckedChange={(v) => updateCustomLayout('showDataLabels', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === VISUAL STYLE === */}
        <AccordionItem value="visual">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Visual Style')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Icon Style')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.iconStyle}
                onChange={(v) => updateCustomLayout('iconStyle', v)}
                options={[
                  { value: 'filled-circle', label: t('Filled') },
                  { value: 'outlined', label: t('Outlined') },
                  { value: 'square', label: t('Square') },
                  { value: 'gradient-blob', label: t('Blob') },
                  { value: 'none', label: t('None') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Section Accent')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.sectionAccent}
                onChange={(v) => updateCustomLayout('sectionAccent', v)}
                options={[
                  { value: 'none', label: t('None') },
                  { value: 'left-border', label: t('Left Border') },
                  { value: 'top-border', label: t('Top Border') },
                  { value: 'gradient-top', label: t('Gradient') },
                  { value: 'corner-dot', label: t('Corner Dot') },
                  { value: 'icon-watermark', label: t('Watermark') },
                ]}
              />
            </div>

            {cl.sectionAccent !== 'none' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('Accent Color')}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={cl.sectionAccentColor || primaryColor} onChange={(e) => updateCustomLayout('sectionAccentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={cl.sectionAccentColor || primaryColor} onChange={(e) => updateCustomLayout('sectionAccentColor', e.target.value)} className="font-mono text-xs flex-1" maxLength={7} />
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Show Section Descriptions')}</Label>
                <Switch checked={cl.showSectionDescription} onCheckedChange={(v) => updateCustomLayout('showSectionDescription', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Alternate Section Backgrounds')}</Label>
                <Switch checked={cl.sectionBackgroundAlternate} onCheckedChange={(v) => updateCustomLayout('sectionBackgroundAlternate', v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Background Pattern')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.backgroundPattern}
                onChange={(v) => updateCustomLayout('backgroundPattern', v)}
                options={[
                  { value: 'none', label: t('None') },
                  { value: 'dots', label: t('Dots') },
                  { value: 'grid', label: t('Grid') },
                  { value: 'diagonal-lines', label: t('Diagonal') },
                  { value: 'subtle-noise', label: t('Noise') },
                ]}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === PRODUCT HEADER === */}
        <AccordionItem value="product-header">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Product Header')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Header Layout')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.productHeaderLayout}
                onChange={(v) => updateCustomLayout('productHeaderLayout', v)}
                options={[
                  { value: 'horizontal', label: t('Horizontal') },
                  { value: 'stacked', label: t('Stacked') },
                  { value: 'overlay', label: t('Overlay') },
                  { value: 'minimal', label: t('Minimal') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Image Style')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.imageDisplayStyle}
                onChange={(v) => updateCustomLayout('imageDisplayStyle', v)}
                options={[
                  { value: 'rounded', label: t('Rounded') },
                  { value: 'square', label: t('Square') },
                  { value: 'circle', label: t('Circle') },
                  { value: 'hero-banner', label: t('Banner') },
                  { value: 'side-panel', label: t('Side') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Rating Visualization')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.ratingVisualization}
                onChange={(v) => updateCustomLayout('ratingVisualization', v)}
                options={[
                  { value: 'circle-badge', label: t('Circle') },
                  { value: 'letter-grade', label: t('Letter') },
                  { value: 'progress-bar', label: t('Bar') },
                  { value: 'stars', label: t('Stars') },
                  { value: 'speedometer', label: t('Speed') },
                ]}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs">{t('Show Product Badges')}</Label>
              <Switch checked={cl.showProductBadges} onCheckedChange={(v) => updateCustomLayout('showProductBadges', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === HERO === */}
        <AccordionItem value="hero">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Hero / Header')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('Show Hero Section')}</Label>
              <Switch checked={resolved.hero.visible} onCheckedChange={(v) => updateHero('visible', v)} />
            </div>

            {resolved.hero.visible && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('Hero Style')}</Label>
                  <DPPDisplayModeSelector
                    columns={4}
                    value={resolved.hero.style}
                    onChange={(v) => updateHero('style', v)}
                    options={[
                      { value: 'gradient', label: t('Gradient') },
                      { value: 'solid', label: t('Solid') },
                      { value: 'image', label: t('Image') },
                      { value: 'minimal', label: t('Minimal') },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('Hero Height')}</Label>
                  <DPPDisplayModeSelector
                    columns={3}
                    value={resolved.hero.height}
                    onChange={(v) => updateHero('height', v)}
                    options={[
                      { value: 'compact', label: t('Compact') },
                      { value: 'normal', label: t('Medium') },
                      { value: 'tall', label: t('Tall') },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('Content Alignment')}</Label>
                  <DPPDisplayModeSelector
                    columns={3}
                    value={cl.heroContentAlignment}
                    onChange={(v) => updateCustomLayout('heroContentAlignment', v)}
                    options={[
                      { value: 'left', label: t('Left') },
                      { value: 'center', label: t('Center') },
                      { value: 'right', label: t('Right') },
                    ]}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('Show Description in Hero')}</Label>
                    <Switch checked={cl.heroShowDescription} onCheckedChange={(v) => updateCustomLayout('heroShowDescription', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('Show Badges in Hero')}</Label>
                    <Switch checked={cl.heroShowBadges} onCheckedChange={(v) => updateCustomLayout('heroShowBadges', v)} />
                  </div>
                </div>

                {resolved.hero.style === 'image' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t('Upload Hero Image')}</Label>
                      <div
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => heroInputRef.current?.click()}
                      >
                        {isUploadingHero ? (
                          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                        ) : resolved.hero.backgroundImage ? (
                          <img src={resolved.hero.backgroundImage} alt="Hero" className="h-16 mx-auto rounded object-cover" />
                        ) : (
                          <><Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" /><p className="text-xs text-muted-foreground">{t('PNG, JPG, WebP up to 2MB')}</p></>
                        )}
                      </div>
                      <input ref={heroInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleHeroUpload(file); }} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('Overlay Opacity')}: {resolved.hero.overlayOpacity}%</Label>
                      <Slider value={[resolved.hero.overlayOpacity]} onValueChange={([v]) => updateHero('overlayOpacity', v)} min={0} max={100} step={5} />
                    </div>
                  </>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* === ANIMATIONS === */}
        <AccordionItem value="animations">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Animations')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Entry Animation')}</Label>
              <DPPDisplayModeSelector
                columns={5}
                value={cl.entryAnimation}
                onChange={(v) => updateCustomLayout('entryAnimation', v)}
                options={[
                  { value: 'none', label: t('None') },
                  { value: 'fade-in', label: t('Fade In') },
                  { value: 'slide-up', label: t('Slide Up') },
                  { value: 'slide-left', label: t('Slide Left') },
                  { value: 'scale', label: t('Scale') },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('Stagger Animation')}</Label>
              <Switch checked={cl.animationStagger} onCheckedChange={(v) => updateCustomLayout('animationStagger', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === CUSTOMS VIEW === */}
        <AccordionItem value="customs">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Customs View')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <p className="text-xs text-muted-foreground">{t('Independent layout settings for the customs authority view')}</p>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Layout Mode')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.customsLayoutMode}
                onChange={(v) => updateCustomLayout('customsLayoutMode', v)}
                options={[
                  { value: 'single-column', label: t('Single') },
                  { value: 'two-column', label: t('Two Column') },
                  { value: 'tabbed', label: t('Tabbed') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Section Style')}</Label>
              <DPPDisplayModeSelector
                columns={3}
                value={cl.customsSectionStyle}
                onChange={(v) => updateCustomLayout('customsSectionStyle', v)}
                options={[
                  { value: 'card', label: t('Cards') },
                  { value: 'flat', label: t('Flat') },
                  { value: 'accordion', label: t('Accordion') },
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Header Style')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.customsHeaderStyle}
                onChange={(v) => updateCustomLayout('customsHeaderStyle', v)}
                options={[
                  { value: 'icon-left', label: t('Icon Left') },
                  { value: 'simple', label: t('Simple') },
                  { value: 'centered', label: t('Centered') },
                  { value: 'underlined', label: t('Underlined') },
                ]}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Compact Mode')}</Label>
                <Switch checked={cl.customsCompactMode} onCheckedChange={(v) => updateCustomLayout('customsCompactMode', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Show Dividers')}</Label>
                <Switch checked={cl.customsShowSectionDividers} onCheckedChange={(v) => updateCustomLayout('customsShowSectionDividers', v)} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === COLORS & TYPOGRAPHY === */}
        <AccordionItem value="colors">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Colors & Typography')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Theme Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Theme Presets')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DPP_THEME_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      designForm.preset === key ? 'border-primary ring-1 ring-primary/20' : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex gap-1 mb-1">
                      {[preset.preview.primary, preset.preview.secondary, preset.preview.accent].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium">{t(preset.name)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="grid grid-cols-2 gap-3">
              {([
                ['secondaryColor', 'Secondary'],
                ['accentColor', 'Accent'],
                ['pageBackground', 'Page BG'],
                ['cardBackground', 'Card BG'],
                ['textColor', 'Text'],
                ['headingColor', 'Heading'],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{t(label)}</Label>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={resolved.colors[key]} onChange={(e) => updateColors(key, e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
                    <Input value={resolved.colors[key]} onChange={(e) => updateColors(key, e.target.value)} className="font-mono text-xs flex-1 h-7" maxLength={7} />
                  </div>
                </div>
              ))}
            </div>

            {/* Typography */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Font Family')}</Label>
              <Select value={resolved.typography.fontFamily} onValueChange={(v) => updateTypography('fontFamily', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('System Default')}</SelectItem>
                  {(['Inter', 'Roboto', 'Poppins', 'Merriweather', 'Playfair Display'] as DPPFontFamily[]).map(f => (
                    <SelectItem key={f} value={f} style={{ fontFamily: FONT_FAMILY_MAP[f] }}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('Heading Size')}</Label>
                <div className="flex gap-0.5">
                  {(['small', 'medium', 'large'] as DPPFontSize[]).map(s => (
                    <button key={s} onClick={() => updateTypography('headingFontSize', s)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${resolved.typography.headingFontSize === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {s.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('Body Size')}</Label>
                <div className="flex gap-0.5">
                  {(['small', 'medium', 'large'] as DPPFontSize[]).map(s => (
                    <button key={s} onClick={() => updateTypography('bodyFontSize', s)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${resolved.typography.bodyFontSize === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {s.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('Heading Weight')}</Label>
              <Select value={resolved.typography.headingFontWeight} onValueChange={(v) => updateTypography('headingFontWeight', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['normal', 'semibold', 'bold', 'extrabold'] as DPPFontWeight[]).map(w => (
                    <SelectItem key={w} value={w} style={{ fontWeight: FONT_WEIGHT_MAP[w] }}>
                      {t({ normal: 'Normal', semibold: 'Semibold', bold: 'Bold', extrabold: 'Extra Bold' }[w])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === CARD STYLING === */}
        <AccordionItem value="cards">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Card Styling')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Border Radius')}</Label>
              <div className="flex gap-1.5">
                {(['none', 'small', 'medium', 'large', 'full'] as DPPBorderRadius[]).map(r => (
                  <button key={r} onClick={() => updateCards('borderRadius', r)}
                    className={`flex-1 p-1.5 flex flex-col items-center gap-1 rounded-lg border transition-all ${
                      resolved.cards.borderRadius === r ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}>
                    <div className="w-6 h-6 bg-muted border" style={{ borderRadius: BORDER_RADIUS_MAP[r] }} />
                    <span className="text-[10px]">{r.charAt(0).toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Shadow')}</Label>
              <div className="flex gap-1.5">
                {(['none', 'subtle', 'medium', 'strong'] as DPPShadowDepth[]).map(s => (
                  <button key={s} onClick={() => updateCards('shadowDepth', s)}
                    className={`flex-1 p-1.5 flex flex-col items-center gap-1 rounded-lg border transition-all ${
                      resolved.cards.shadowDepth === s ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}>
                    <div className="w-6 h-6 bg-white rounded-md" style={{ boxShadow: SHADOW_MAP[s] }} />
                    <span className="text-[10px]">{s.charAt(0).toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Border')}</Label>
              <div className="flex gap-1.5">
                {(['none', 'thin', 'thick'] as DPPBorderStyle[]).map(b => (
                  <button key={b} onClick={() => updateCards('borderStyle', b)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      resolved.cards.borderStyle === b ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                    {t(b.charAt(0).toUpperCase() + b.slice(1))}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('Background Opacity')}: {resolved.cards.backgroundOpacity}%</Label>
              <Slider value={[resolved.cards.backgroundOpacity]} onValueChange={([v]) => updateCards('backgroundOpacity', v)} min={0} max={100} step={5} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === SECTION ORDER === */}
        <AccordionItem value="sections">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Section Order')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-1.5">
              {resolved.sections.order.map((sectionId, index) => {
                const section = SECTION_LABELS[sectionId];
                const config = resolved.sections.configs[sectionId] ?? { visible: true, defaultCollapsed: false };
                return (
                  <div key={sectionId} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <div className="flex flex-col gap-px">
                      <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveSection(index, 'down')} disabled={index === resolved.sections.order.length - 1} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {section.icon}
                      <span className="text-xs font-medium truncate">{t(section.labelKey)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={config.visible} onCheckedChange={(v) => updateSectionConfig(sectionId, 'visible', v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* === FOOTER === */}
        <AccordionItem value="footer">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold">{t('Footer')}</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('Footer Style')}</Label>
              <DPPDisplayModeSelector
                columns={4}
                value={cl.footerStyle}
                onChange={(v) => updateCustomLayout('footerStyle', v)}
                options={[
                  { value: 'simple', label: t('Simple') },
                  { value: 'centered', label: t('Centered') },
                  { value: 'two-column', label: t('Two Column') },
                  { value: 'dark-band', label: t('Dark Band') },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('Legal Notice URL')}</Label>
                <Input value={resolved.footer.legalNoticeUrl} onChange={(e) => updateFooter('legalNoticeUrl', e.target.value)} placeholder="https://..." className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('Privacy Policy URL')}</Label>
                <Input value={resolved.footer.privacyPolicyUrl} onChange={(e) => updateFooter('privacyPolicyUrl', e.target.value)} placeholder="https://..." className="h-8 text-xs" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('Show Powered By')}</Label>
              <Switch checked={resolved.footer.showPoweredBy} onCheckedChange={(v) => updateFooter('showPoweredBy', v)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['website', 'instagram', 'linkedin', 'twitter'] as const).map(key => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{t(key.charAt(0).toUpperCase() + key.slice(1))}</Label>
                  <Input value={resolved.footer.socialLinks[key]} onChange={(e) => updateSocialLink(key, e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
